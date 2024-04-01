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







let ETF, AuthorizedParticipants
let minter, ap1, ap2, ap3, ap4, ap5, ap6, timeLord, rando, ethDaddy

describe('ETF', () => {
  beforeEach(async () => {
    _start = await snapshot()

    const signers = await ethers.getSigners()

    minter = signers[0]
    ap1 = signers[1]
    ap2 = signers[2]
    ap3 = signers[3]
    ap4 = signers[4]
    ap5 = signers[5]
    ap6 = signers[6]
    timeLord = signers[7]
    rando = signers[8]

    ethDaddy = await ethers.getImpersonatedSigner('0x47144372eb383466D18FC91DB9Cd0396Aa6c87A4')



    const ETFFactory = await ethers.getContractFactory('ETF', minter)
    ETF = await ETFFactory.deploy()
    await ETF.deployed()

    const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipants', minter)

    AuthorizedParticipants = await AuthorizedParticipantFactory.attach(
      await ETF.authorizedParticipants()
    )


    await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)
  })
  afterEach(() => _start.restore())



  it('init', async () => {

    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap2.address, 2)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap3.address, 3)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap4.address, 4)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap5.address, 5)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap6.address, 6)


    expect(await AuthorizedParticipants.connect(minter).totalSupply()).to.equal(7)
    expect(await AuthorizedParticipants.connect(minter).exists(0)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(1)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(2)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(3)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(4)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(5)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(6)).to.equal(true)
    expect(await AuthorizedParticipants.connect(minter).exists(7)).to.equal(false)


    for (let i = 0; i < 7; i++) {
      console.log(getSVG(await AuthorizedParticipants.tokenURI(i)))
    }
  })

  it('only APs should be able to create tokens', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap2.address, 2)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)


    await expectRevert(
      ETF.connect(minter).create(1, minter.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )

    await expectRevert(
      ETF.connect(timeLord).create(0, minter.address, txValue('1')),
      'Time Lord cannot create tokens'
    )

    await expectRevert(
      ETF.connect(ap2).create(1, minter.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )


    const startingEthBalance = await getBalance(ap1)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))

    const endingEthBalance = await getBalance(ap1)
    expect(startingEthBalance -  endingEthBalance).to.be.closeTo(1, 0.005)


    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(0)
    expect(ethVal(await ETF.balanceOf(ap2.address))).to.equal(0)
    expect(ethVal(await ETF.totalSupply())).to.equal(10000)

    await ETF.connect(ap1).create(1, rando.address, txValue('0.5'))

    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(5000)
    expect(ethVal(await ETF.balanceOf(ap2.address))).to.equal(0)
    expect(ethVal(await ETF.totalSupply())).to.equal(15000)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))
    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(20000)

    expect(ethVal(await ETF.connect(ap1).created(1))).to.equal(25000)
  })

  it('only APs should be able to redeem tokens', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))
    await ETF.connect(ap1).transfer(rando.address, toETH(1000))
    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(9000)
    expect(ethVal(await ETF.balanceOf(rando.address))).to.equal(1000)

    const startingBalance = await getBalance(ap1)
    await ETF.connect(ap1).redeem(1, ap1.address, toETH(7000))
    const endingBalance = await getBalance(ap1)

    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(2000)
    expect(endingBalance - startingBalance).to.be.closeTo(0.7, 0.005)

    await expectRevert(
      ETF.connect(rando).redeem(1, rando.address, toETH(2000)),
      'Only Authorized Participants can redeem tokens'
    )
    await ETF.connect(rando).transfer(timeLord.address, toETH(1000))

    await expectRevert(
      ETF.connect(timeLord).redeem(0, timeLord.address, toETH(2000)),
      'Time Lord cannot redeem tokens'
    )


    const startingRandoBalance = await getBalance(rando)
    await ETF.connect(ap1).redeem(1, rando.address, toETH(2000))
    const endingRandoBalance = await getBalance(rando)
    expect(endingRandoBalance - startingRandoBalance).to.be.closeTo(0.2, 0.005)


    expect(ethVal(await ETF.connect(ap1).created(1))).to.equal(10000)
    expect(ethVal(await ETF.connect(ap1).redeemed(1))).to.equal(9000)

  })

  it('should not trade outside market hours', async () => {
    const errorMsg = 'Can only transfer during market trading hours (9:30am-4:00pm EST, M-F)'

    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))


    await time.increaseTo(2020429740) // Mon Jan 09 2034 09:29:00 GMT-0500 (Eastern Standard Time)


    for (let d = 0; d < 7; d++) {
      const marketDay = d < 5


      expect(await ETF.marketIsOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(rando.address, toETH(1)),
        errorMsg
      )
      await time.increase(time.duration.minutes(2))

      if (marketDay) {
        expect(await ETF.marketIsOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.marketIsOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.hours(6))
      await time.increase(time.duration.minutes(28))

      if (marketDay) {
        expect(await ETF.marketIsOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.marketIsOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.minutes(2))

      expect(await ETF.marketIsOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(rando.address, toETH(1)),
        errorMsg
      )

      await time.increase(time.duration.hours(17))
      await time.increase(time.duration.minutes(28))
    }
  })


  it('should only let TLs set market holidays')
  it('market holidays should work')
  it('should only let TLs set DST')
  it('DST should work')

  it('KYC should work', async () => {
    const KYCFactory = await ethers.getContractFactory('KYC', minter)
    KYC = await KYCFactory.deploy(ETF.address, AuthorizedParticipants.address)
    await KYC.deployed()

    await KYC.connect(ap1).mint('joe', 'schmoe', txValue('0.01'))

    const kycId = await KYC.connect(ap1).getId('joe', 'schmoe')
    console.log(kycId, getSVG(await KYC.connect(ap1).tokenURI(kycId)))
  })

})



