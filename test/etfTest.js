const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')

const toETH = amt => ethers.utils.parseEther(String(amt))
const txValue = amt => ({ value: toETH(amt) })
const ethVal = n => Number(ethers.utils.formatEther(n))
const num = n => Number(n)

const getBalance = async a => ethVal(await ethers.provider.getBalance(a.address))

const ARBITRARY_MARKET_OPEN_TIME = 1894118400
const FUTURE_MONDAY_AM = 2020428000


function times(t, fn) {
  const out = []
  for (let i = 0; i < t; i++) out.push(fn(i))
  return out
}

const utf8Clean = raw => raw.replace(/data.*utf8,/, '')
const b64Clean = raw => raw.replace(/data.*,/, '')
const b64Decode = raw => Buffer.from(b64Clean(raw), 'base64').toString('utf8')
const getJsonURI = rawURI => JSON.parse(utf8Clean(rawURI))
const getSVG = rawURI => b64Decode(JSON.parse(utf8Clean(rawURI)).image)



const ONE_DAY = 60 * 60 * 24
const TEN_MINUTES = 60 * 10
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'

const contractBalance = contract => contract.provider.getBalance(contract.address)







let ETF, AuthorizedParticipant
let minter, ap0, ap1, ap2, ap3, ap4, ap5, ethDaddy

describe('ETF', () => {
  beforeEach(async () => {
    _start = await snapshot()

    const signers = await ethers.getSigners()

    minter = signers[0]
    ap0 = signers[1]
    ap1 = signers[2]
    ap2 = signers[3]
    ap3 = signers[4]
    ap4 = signers[5]
    ap5 = signers[6]
    rando = signers[7]

    ethDaddy = await ethers.getImpersonatedSigner('0x47144372eb383466D18FC91DB9Cd0396Aa6c87A4')



    const ETFFactory = await ethers.getContractFactory('ETF', minter)
    ETF = await ETFFactory.deploy()
    await ETF.deployed()

    const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipant', minter)

    AuthorizedParticipant = await AuthorizedParticipantFactory.attach(
      await ETF.authorizedParticipant()
    )


    await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)
  })
  afterEach(() => _start.restore())



  it('init', async () => {

    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap0.address, 0)
    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap1.address, 1)
    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap2.address, 2)
    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap3.address, 3)
    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap4.address, 4)
    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap4.address, 5)


    expect(await AuthorizedParticipant.connect(minter).totalSupply()).to.equal(6)
    expect(await AuthorizedParticipant.connect(minter).exists(0)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(1)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(2)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(3)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(4)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(5)).to.equal(true)
    expect(await AuthorizedParticipant.connect(minter).exists(6)).to.equal(false)


    for (let i = 0; i < 6; i++) {
      console.log(getSVG(await AuthorizedParticipant.tokenURI(i)))
    }
  })

  it('only APs should be able to create tokens', async () => {
    await AuthorizedParticipant.connect(minter)[safeTransferFrom](minter.address, ap0.address, 0)
    await AuthorizedParticipant.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)


    await expectRevert(
      ETF.connect(minter).create(0, minter.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )

    await expectRevert(
      ETF.connect(ap0).create(1, minter.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )


    const startingEthBalance = await getBalance(ap0)

    await ETF.connect(ap0).create(0, ap0.address, txValue('1'))

    const endingEthBalance = await getBalance(ap0)
    expect(startingEthBalance -  endingEthBalance).to.be.closeTo(1, 0.005)


    expect(ethVal(await ETF.balanceOf(ap0.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(0)
    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(0)
    expect(ethVal(await ETF.totalSupply())).to.equal(10000)

    await ETF.connect(ap0).create(0, rando.address, txValue('0.5'))

    expect(ethVal(await ETF.balanceOf(ap0.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(5000)
    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(0)
    expect(ethVal(await ETF.totalSupply())).to.equal(15000)

    await ETF.connect(ap0).create(0, ap0.address, txValue('1'))
    expect(ethVal(await ETF.balanceOf(ap0.address))).to.equal(20000)

    expect(ethVal(await ETF.connect(ap0).created(0))).to.equal(25000)
  })

  it('only APs should be able to redeem tokens', async () => {
    await AuthorizedParticipant.connect(minter).mint(ap0.address, 0)
    await ETF.connect(ap0).create(0, ap0.address, txValue('1'))
    await ETF.connect(ap0).transfer(rando.address, toETH(1000))
    expect(ethVal(await ETF.balanceOf(ap0.address))).to.equal(9000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(1000)

    const startingBalance = await getBalance(ap0)
    await ETF.connect(ap0).redeem(0, ap0.address, toETH(7000))
    const endingBalance = await getBalance(ap0)

    expect(ethVal(await ETF.balanceOf(ap0.address))).to.equal(2000)
    expect(endingBalance - startingBalance).to.be.closeTo(0.7, 0.005)

    await expectRevert(
      ETF.connect(rando).redeem(0, rando.address, toETH(2000)),
      'Only Authorized Participants can redeem tokens'
    )


    const startingRandoBalance = await getBalance(rando)
    await ETF.connect(ap0).redeem(0, rando.address, toETH(2000))
    const endingRandoBalance = await getBalance(rando)
    expect(endingRandoBalance - startingRandoBalance).to.be.closeTo(0.2, 0.005)


    expect(ethVal(await ETF.connect(ap0).created(0))).to.equal(10000)
    expect(ethVal(await ETF.connect(ap0).redeemed(0))).to.equal(9000)

  })

  it('should not trade outside market hours', async () => {
    const errorMsg = 'Can only transfer during market trading hours (9:30am-4:00pm EST, M-F)'

    await AuthorizedParticipant.connect(minter).[safeTransferFrom](minter.address, ap0.address, 0)
    await ETF.connect(ap0).create(0, ap0.address, txValue('1'))


    await time.increaseTo(2020429740) // Mon Jan 09 2034 09:29:00 GMT-0500 (Eastern Standard Time)


    for (let d = 0; d < 7; d++) {
      const marketDay = d < 5


      expect(await ETF.marketIsOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap0).transfer(rando.address, toETH(1)),
        errorMsg
      )
      await time.increase(time.duration.minutes(2))

      if (marketDay) {
        expect(await ETF.marketIsOpen()).to.equal(true)
        await ETF.connect(ap0).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.marketIsOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap0).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.hours(6))
      await time.increase(time.duration.minutes(28))

      if (marketDay) {
        expect(await ETF.marketIsOpen()).to.equal(true)
        await ETF.connect(ap0).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.marketIsOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap0).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.minutes(2))

      expect(await ETF.marketIsOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap0).transfer(rando.address, toETH(1)),
        errorMsg
      )

      await time.increase(time.duration.hours(17))
      await time.increase(time.duration.minutes(28))
    }
  })

})



