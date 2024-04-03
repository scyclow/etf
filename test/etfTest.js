const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { expectRevert, time, snapshot } = require('@openzeppelin/test-helpers')

const toETH = amt => ethers.utils.parseEther(String(amt))
const txValue = amt => ({ value: toETH(amt) })
const ethVal = n => Number(ethers.utils.formatEther(n))
const num = n => Number(n)

const getBalance = async a => ethVal(await ethers.provider.getBalance(a.address))

const ARBITRARY_MARKET_OPEN_TIME = 1894118400
const FUTURE_MONDAY_AM = 2020429800


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


    const json = getJsonURI(await AuthorizedParticipants.tokenURI(0))
    expect(json.name).to.equal(`Time Lord`)
    expect(json.description).to.equal('ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. The Time Lord has the sole ability to set Market Holidays and declare Daylight Savings Time.')

    for (let i = 1; i < 7; i++) {
      const json = getJsonURI(await AuthorizedParticipants.tokenURI(i))
      expect(json.name).to.equal(`Authorized Participant ${i}`)
      expect(json.description).to.equal(`ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. Authorized Participants have the right (but not the obligation) to create and redeem shares of ETF.`)
    }

    await expectRevert(
      AuthorizedParticipants.connect(rando).setURIContract(rando.address),
      'Ownable: caller is not the owner'
    )
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
    expect(startingEthBalance - endingEthBalance).to.be.closeTo(1, 0.005)


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

    const json = getJsonURI(await AuthorizedParticipants.tokenURI(1))
    expect(json.attributes[0].value).to.equal('25000')
    expect(json.attributes[0].trait_type).to.equal('Shares Created')
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
    expect(ethVal(await ETF.connect(ap1).totalSupply())).to.equal(1000)
    expect(ethVal(await ETF.connect(ap1).nav())).to.equal(0.0001)

    const json = getJsonURI(await AuthorizedParticipants.tokenURI(1))
    expect(json.attributes[0].value).to.equal('10000')
    expect(json.attributes[0].trait_type).to.equal('Shares Created')
    expect(json.attributes[1].value).to.equal('9000')
    expect(json.attributes[1].trait_type).to.equal('Shares Redeemed')
  })

  it('should not trade outside market hours', async () => {
    const errorMsg = 'Can only transfer during market trading hours'

    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))


    await time.increaseTo(2020429740) // Mon Jan 09 2034 09:29:00 GMT-0500 (Eastern Standard Time)


    for (let d = 0; d < 7; d++) {
      const marketDay = d < 5

      expect(await ETF.isMarketOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(rando.address, toETH(1)),
        errorMsg
      )
      await time.increase(time.duration.minutes(2))

      if (marketDay) {
        expect(await ETF.isMarketOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.isMarketOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.hours(6))
      await time.increase(time.duration.minutes(28))

      if (marketDay) {
        expect(await ETF.isMarketOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(rando.address, toETH(1))
      } else {
        expect(await ETF.isMarketOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(rando.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.minutes(2))

      expect(await ETF.isMarketOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(rando.address, toETH(1)),
        errorMsg
      )

      await time.increase(time.duration.hours(17))
      await time.increase(time.duration.minutes(28))
    }
  })

  it('5 APs can revoke the 6th, but not the Time Lord', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap2.address, 2)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap3.address, 3)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap4.address, 4)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap5.address, 5)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap6.address, 6)

    expect(await AuthorizedParticipants.connect(minter).ownerOf(6)).to.equal(ap6.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(0, rando.address),
      'Not enough votes to revoke AP token'
    )

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, rando.address),
      'Not enough votes to revoke AP token'
    )


    await expectRevert(
      AuthorizedParticipants.connect(rando).proposeRevoke(1, 6, rando.address),
      'Not authorized to make revoke proposal'
    )

    await expectRevert(
      AuthorizedParticipants.connect(timeLord).proposeRevoke(0, 6, rando.address),
      'Time Lord cannot revoke'
    )

    await expectRevert(
      AuthorizedParticipants.connect(ap1).proposeRevoke(1, 0, rando.address),
      'Cannot revoke the Time Lord'
    )

    await AuthorizedParticipants.connect(ap1).proposeRevoke(1, 6, rando.address)
    await AuthorizedParticipants.connect(ap2).proposeRevoke(2, 6, rando.address)
    await AuthorizedParticipants.connect(ap3).proposeRevoke(3, 6, rando.address)
    await AuthorizedParticipants.connect(ap4).proposeRevoke(4, 6, rando.address)
    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 2, rando.address)


    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, rando.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, ap1.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, rando.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, rando.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, minter.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap1).revoke(6, rando.address)

    expect(await AuthorizedParticipants.connect(minter).ownerOf(6)).to.equal(rando.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, rando.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap1).proposeRevoke(1, 6, ap6.address)
    await AuthorizedParticipants.connect(ap2).proposeRevoke(2, 6, ap6.address)
    await AuthorizedParticipants.connect(ap3).proposeRevoke(3, 6, ap6.address)
    await AuthorizedParticipants.connect(ap4).proposeRevoke(4, 6, ap6.address)
    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, ap6.address)
    await AuthorizedParticipants.connect(rando).proposeRevoke(6, 6, rando.address)
    await AuthorizedParticipants.connect(ap1).revoke(6, ap6.address)

    expect(await AuthorizedParticipants.connect(minter).ownerOf(6)).to.equal(ap6.address)
  })


  it('should only let TLs set market holidays, DST', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)

    await expectRevert(
      ETF.connect(ap1).declareDST(true),
      'Only the Time Lord can declare DST'
    )
    await expectRevert(
      ETF.connect(minter).declareDST(true),
      'Only the Time Lord can declare DST'
    )

    const marketHolidayDay = Number((await ETF.daysElapsed()).toString()) + 1


    await expectRevert(
      ETF.connect(ap1).declareMarketHoliday(marketHolidayDay),
      'Only the Time Lord can declare Market Holidays'
    )

    await expectRevert(
      ETF.connect(minter).declareMarketHoliday(marketHolidayDay),
      'Only the Time Lord can declare Market Holidays'
    )


    expect(await ETF.connect(ap1).isDST()).to.equal(false)
    expect(await ETF.connect(ap1).isMarketHoliday(marketHolidayDay)).to.equal(false)

    await ETF.connect(timeLord).declareDST(true)
    expect(await ETF.connect(ap1).isDST()).to.equal(true)
    await ETF.connect(timeLord).declareDST(false)
    expect(await ETF.connect(ap1).isDST()).to.equal(false)

    await ETF.connect(timeLord).declareMarketHoliday(marketHolidayDay)
    expect(await ETF.connect(ap1).isMarketHoliday(marketHolidayDay)).to.equal(true)



  })
  it('market holidays should work', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)

    expect(await ETF.isMarketOpen()).to.equal(true)
    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))

    const daysElapsed = Number((await ETF.daysElapsed()).toString())
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed)
    expect(await ETF.isMarketOpen()).to.equal(false)
    await expectRevert(
      ETF.connect(ap1).create(1, ap1.address, txValue('1')),
      'Can only transfer during market trading hours'
    )

    await expectRevert(
      ETF.connect(timeLord).declareMarketHoliday(daysElapsed-1),
      'The Time Lord can only declare Market Holidays within the fiscal year'
    )

    await expectRevert(
      ETF.connect(timeLord).declareMarketHoliday(daysElapsed+400),
      'The Time Lord can only declare Market Holidays within the fiscal year'
    )

    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+1)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+2)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+3)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+4)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+5)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+6)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+7)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+8)
    await ETF.connect(timeLord).declareMarketHoliday(daysElapsed+9)

    await expectRevert(
      ETF.connect(timeLord).declareMarketHoliday(daysElapsed+10),
      'The Time Lord can only declare 10 Market Holidays per fiscal year'
    )

  })

  it('DST should work', async () => {
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(minter)[safeTransferFrom](minter.address, ap1.address, 1)

    await time.increaseTo(FUTURE_MONDAY_AM - 3600) // 8:30am
    expect(await ETF.isMarketOpen()).to.equal(false)
    expect(await ETF.isDST()).to.equal(false)

    await expectRevert(
      ETF.connect(ap1).create(1, ap1.address, txValue('1')),
      'Can only transfer during market trading hours'
    )

    await ETF.connect(timeLord).declareDST(true) // 9:30am
    expect(await ETF.isDST()).to.equal(true)
    expect(await ETF.isMarketOpen()).to.equal(true)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))


    await time.increase(time.duration.hours(6))
    await time.increase(time.duration.minutes(31)) // 4:01pm


    expect(await ETF.isMarketOpen()).to.equal(false)
    await expectRevert(
      ETF.connect(ap1).create(1, ap1.address, txValue('1')),
      'Can only transfer during market trading hours'
    )

    await ETF.connect(timeLord).declareDST(false) // 3:01pm
    expect(await ETF.isDST()).to.equal(false)
    expect(await ETF.isMarketOpen()).to.equal(true)
    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))

    await time.increase(time.duration.hours(1)) // 4:01
    expect(await ETF.isMarketOpen()).to.equal(false)
  })

  it('KYC should work', async () => {
    const KYCFactory = await ethers.getContractFactory('KYC', minter)
    KYC = await KYCFactory.deploy(ETF.address, AuthorizedParticipants.address)
    await KYC.deployed()

    await expectRevert(
      KYC.connect(ap1).mint('joe', 'schmoe'),
      'Must pay KYC fee'
    )

    await expectRevert(
      KYC.connect(ap1).mint('joe', '', txValue('0.01')),
      'Invalid KYC info'
    )

    await expectRevert(
      KYC.connect(ap1).mint('', 'schmoe', txValue('0.01')),
      'Invalid KYC info'
    )

    await KYC.connect(ap1).mint('joe', 'schmoe', txValue('0.01'))
    await expectRevert(
      KYC.connect(ap1).mint('joe', 'schmoe', txValue('0.01')),
      'KYC already registered'
    )

    const kycId = await KYC.connect(ap1).getId('joe', 'schmoe')


    expect(await KYC.connect(ap1).totalSupply()).to.equal(1)
    expect(await KYC.connect(ap1).exists(kycId)).to.equal(true)
    expect(await KYC.connect(ap1).ownerOf(kycId)).to.equal(ap1.address)

    const json = getJsonURI(await KYC.connect(ap1).tokenURI(kycId))
    expect(json.attributes[0].trait_type).to.equal('First Name')
    expect(json.attributes[1].trait_type).to.equal('Last Name')
    expect(json.attributes[2].trait_type).to.equal('Address')

    expect(json.attributes[0].value).to.equal('joe')
    expect(json.attributes[1].value).to.equal('schmoe')
    expect(json.attributes[2].value).to.equal(ap1.address.toLowerCase())
  })

  it('KYC should be revoked by contract owner (and only contract owner), and burnable by owner', async () => {
    const KYCFactory = await ethers.getContractFactory('KYC', minter)
    KYC = await KYCFactory.deploy(ETF.address, AuthorizedParticipants.address)
    await KYC.deployed()

    await KYC.connect(ap1).mint('joe', 'schmoe', txValue('0.01'))

    const kycId = await KYC.connect(ap1).getId('joe', 'schmoe')


    await expectRevert(
      KYC.connect(ap1).revoke(kycId),
      'Ownable: caller is not the owner'
    )

    await KYC.connect(minter).revoke(kycId)

    expect(await KYC.connect(ap1).exists(kycId)).to.equal(false)

    await KYC.connect(ap2).mint('Al', 'Sharpton', txValue('0.01'))
    const kycId2 = await KYC.connect(ap1).getId('Al', 'Sharpton')

    await expectRevert(
      KYC.connect(ap1).burn(kycId2),
      'ERC721: caller is not token owner or approved'
    )

    await KYC.connect(ap2).burn(kycId2)
    expect(await KYC.connect(ap1).exists(kycId2)).to.equal(false)

  })

})



