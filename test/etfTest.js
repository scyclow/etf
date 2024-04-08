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







let ETF, AuthorizedParticipants, KYC, BrokerDealer
let admin, ap1, ap2, ap3, ap4, ap5, ap6, timeLord, investor, ethDaddy

describe('ETF', () => {
  beforeEach(async () => {
    _start = await snapshot()

    const signers = await ethers.getSigners()

    admin = signers[0]
    ap1 = signers[1]
    ap2 = signers[2]
    ap3 = signers[3]
    ap4 = signers[4]
    ap5 = signers[5]
    ap6 = signers[6]
    timeLord = signers[7]
    investor = signers[8]

    ethDaddy = await ethers.getImpersonatedSigner('0x47144372eb383466D18FC91DB9Cd0396Aa6c87A4')



    const ETFFactory = await ethers.getContractFactory('ETF', admin)
    ETF = await ETFFactory.deploy()
    await ETF.deployed()

    const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipants', admin)

    AuthorizedParticipants = await AuthorizedParticipantFactory.attach(
      await ETF.authorizedParticipants()
    )


    const KYCFactory = await ethers.getContractFactory('KYC', admin)
    KYC = await KYCFactory.deploy(ETF.address)
    await KYC.deployed()

    const BrokerDealerFactory = await ethers.getContractFactory('BrokerDealer', admin)
    BrokerDealer = await BrokerDealerFactory.deploy(ETF.address, AuthorizedParticipants.address, KYC.address)
    await BrokerDealer.deployed()


    expect(num(await ETF.yearsElapsed())).to.equal(0)

    await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)
  })
  afterEach(() => _start.restore())



  it('inception', async () => {

    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap2.address, 2)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap3.address, 3)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap4.address, 4)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap5.address, 5)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap6.address, 6)


    expect(await AuthorizedParticipants.connect(admin).totalSupply()).to.equal(7)
    expect(await AuthorizedParticipants.connect(admin).exists(0)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(1)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(2)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(3)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(4)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(5)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(6)).to.equal(true)
    expect(await AuthorizedParticipants.connect(admin).exists(7)).to.equal(false)




    const json = getJsonURI(await AuthorizedParticipants.tokenURI(0))
    expect(json.name).to.equal(`Time Lord`)
    expect(json.description).to.equal('ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. The Time Lord has the sole ability to declare Market Holidays and DST.')

    for (let i = 1; i < 7; i++) {
      const json = getJsonURI(await AuthorizedParticipants.tokenURI(i))
      expect(json.name).to.equal(`Authorized Participant ${i}`)
      expect(json.description).to.equal(`ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. Authorized Participants have the right (but not the obligation) to create and redeem shares of ETF.`)
    }

    await expectRevert(
      AuthorizedParticipants.connect(investor).setURIContract(investor.address),
      'Ownable: caller is not the owner'
    )
  })

  it('only APs should be able to create tokens', async () => {
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap2.address, 2)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)


    await expectRevert(
      ETF.connect(admin).create(1, admin.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )

    await expectRevert(
      ETF.connect(timeLord).create(0, admin.address, txValue('1')),
      'Time Lord cannot create tokens'
    )

    await expectRevert(
      ETF.connect(ap2).create(1, admin.address, txValue('1')),
      'Only Authorized Participants can create tokens'
    )


    const startingEthBalance = await getBalance(ap1)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))

    const endingEthBalance = await getBalance(ap1)
    expect(startingEthBalance - endingEthBalance).to.be.closeTo(1, 0.005)


    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(0)
    expect(ethVal(await ETF.balanceOf(ap2.address))).to.equal(0)
    expect(ethVal(await ETF.totalSupply())).to.equal(10000)

    await ETF.connect(ap1).create(1, investor.address, txValue('0.5'))

    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(10000)
    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(5000)
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
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)

    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))
    await ETF.connect(ap1).transfer(investor.address, toETH(1000))
    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(9000)
    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(1000)

    const startingBalance = await getBalance(ap1)
    await ETF.connect(ap1).redeem(1, ap1.address, toETH(7000))
    const endingBalance = await getBalance(ap1)

    expect(ethVal(await ETF.balanceOf(ap1.address))).to.equal(2000)
    expect(endingBalance - startingBalance).to.be.closeTo(0.7, 0.005)

    await expectRevert(
      ETF.connect(investor).redeem(1, investor.address, toETH(2000)),
      'Only Authorized Participants can redeem tokens'
    )
    await ETF.connect(investor).transfer(timeLord.address, toETH(1000))

    await expectRevert(
      ETF.connect(timeLord).redeem(0, timeLord.address, toETH(2000)),
      'Time Lord cannot redeem tokens'
    )


    const startingRandoBalance = await getBalance(investor)
    await ETF.connect(ap1).redeem(1, investor.address, toETH(2000))
    const endingRandoBalance = await getBalance(investor)
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

    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await ETF.connect(ap1).create(1, ap1.address, txValue('1'))


    await time.increaseTo(2020429740) // Mon Jan 09 2034 09:29:00 GMT-0500 (Eastern Standard Time)


    for (let d = 0; d < 7; d++) {
      const marketDay = d < 5

      expect(await ETF.isMarketOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(investor.address, toETH(1)),
        errorMsg
      )
      await time.increase(time.duration.minutes(2))

      if (marketDay) {
        expect(await ETF.isMarketOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(investor.address, toETH(1))
      } else {
        expect(await ETF.isMarketOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(investor.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.hours(6))
      await time.increase(time.duration.minutes(28))

      if (marketDay) {
        expect(await ETF.isMarketOpen()).to.equal(true)
        await ETF.connect(ap1).transfer(investor.address, toETH(1))
      } else {
        expect(await ETF.isMarketOpen()).to.equal(false)
        await expectRevert(
          ETF.connect(ap1).transfer(investor.address, toETH(1)),
          errorMsg
        )
      }

      await time.increase(time.duration.minutes(2))

      expect(await ETF.isMarketOpen()).to.equal(false)
      await expectRevert(
        ETF.connect(ap1).transfer(investor.address, toETH(1)),
        errorMsg
      )

      await time.increase(time.duration.hours(17))
      await time.increase(time.duration.minutes(28))
    }
  })

  it('5 APs can revoke the 6th, but not the Time Lord', async () => {
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap2.address, 2)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap3.address, 3)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap4.address, 4)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap5.address, 5)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap6.address, 6)

    expect(await AuthorizedParticipants.connect(admin).ownerOf(6)).to.equal(ap6.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(0, investor.address),
      'Not enough votes to revoke AP token'
    )

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, investor.address),
      'Not enough votes to revoke AP token'
    )


    await expectRevert(
      AuthorizedParticipants.connect(investor).proposeRevoke(1, 6, investor.address),
      'Not authorized to make revoke proposal'
    )

    await expectRevert(
      AuthorizedParticipants.connect(timeLord).proposeRevoke(0, 6, investor.address),
      'Time Lord cannot revoke'
    )

    await expectRevert(
      AuthorizedParticipants.connect(ap1).proposeRevoke(1, 0, investor.address),
      'Cannot revoke the Time Lord'
    )

    await AuthorizedParticipants.connect(ap1).proposeRevoke(1, 6, investor.address)
    await AuthorizedParticipants.connect(ap2).proposeRevoke(2, 6, investor.address)
    await AuthorizedParticipants.connect(ap3).proposeRevoke(3, 6, investor.address)
    await AuthorizedParticipants.connect(ap4).proposeRevoke(4, 6, investor.address)
    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 2, investor.address)


    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, investor.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, ap1.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, investor.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, investor.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, admin.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap1).revoke(6, investor.address)

    expect(await AuthorizedParticipants.connect(admin).ownerOf(6)).to.equal(investor.address)

    await expectRevert(
      AuthorizedParticipants.connect(ap1).revoke(6, investor.address),
      'Not enough votes to revoke AP token'
    )

    await AuthorizedParticipants.connect(ap1).proposeRevoke(1, 6, ap6.address)
    await AuthorizedParticipants.connect(ap2).proposeRevoke(2, 6, ap6.address)
    await AuthorizedParticipants.connect(ap3).proposeRevoke(3, 6, ap6.address)
    await AuthorizedParticipants.connect(ap4).proposeRevoke(4, 6, ap6.address)
    await AuthorizedParticipants.connect(ap5).proposeRevoke(5, 6, ap6.address)
    await AuthorizedParticipants.connect(investor).proposeRevoke(6, 6, investor.address)
    await AuthorizedParticipants.connect(ap1).revoke(6, ap6.address)

    expect(await AuthorizedParticipants.connect(admin).ownerOf(6)).to.equal(ap6.address)
  })


  it('should only let TLs set market holidays, DST', async () => {
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)

    await expectRevert(
      ETF.connect(ap1).declareDST(true),
      'Only the Time Lord can declare DST'
    )
    await expectRevert(
      ETF.connect(admin).declareDST(true),
      'Only the Time Lord can declare DST'
    )

    const marketHolidayDay = Number((await ETF.daysElapsed()).toString()) + 1


    await expectRevert(
      ETF.connect(ap1).declareMarketHoliday(marketHolidayDay),
      'Only the Time Lord can declare Market Holidays'
    )

    await expectRevert(
      ETF.connect(admin).declareMarketHoliday(marketHolidayDay),
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
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)

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
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, timeLord.address, 0)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)

    await time.increaseTo(FUTURE_MONDAY_AM - 3600) // 8:30am
    // expect(num(await ETF.yearsElapsed())).to.equal(10)
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

    await expectRevert(
      KYC.connect(ap1).register('joe', ''),
      'Invalid KYC info'
    )

    await expectRevert(
      KYC.connect(ap1).register('', 'schmoe'),
      'Invalid KYC info'
    )

    await KYC.connect(ap1).register('joe', 'schmoe')
    const kycId = await KYC.connect(ap1).getId('joe', 'schmoe')

    expect(await KYC.addrToTokenId(ap1.address)).to.equal(kycId)

    await expectRevert(
      KYC.connect(ap1).register('jack', 'schmoe'),
      'KYC already registered'
    )

    await expectRevert(
      KYC.connect(ap2).register('joe', 'schmoe'),
      'KYC already registered'
    )



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
    await KYC.connect(ap1).register('joe', 'schmoe')

    const kycId = await KYC.connect(ap1).getId('joe', 'schmoe')


    await expectRevert(
      KYC.connect(ap1).revoke(kycId),
      'Ownable: caller is not the owner'
    )

    await KYC.connect(admin).revoke(kycId)

    expect(await KYC.connect(ap1).exists(kycId)).to.equal(false)

    await KYC.connect(ap2).register('Al', 'Sharpton')
    const kycId2 = await KYC.connect(ap1).getId('Al', 'Sharpton')

    await expectRevert(
      KYC.connect(ap1).burn(kycId2),
      'ERC721: caller is not token owner or approved'
    )

    await KYC.connect(ap2).burn(kycId2)
    expect(await KYC.connect(ap1).exists(kycId2)).to.equal(false)
  })


  it('BrokerDealer should only allow original AP sender to withdraw the token', async () => {
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)


    expect(await BrokerDealer.stakedTokenId()).to.equal(0)
    expect(await BrokerDealer.stakedAddr()).to.equal(ZERO_ADDR)

    await AuthorizedParticipants.connect(ap1)[safeTransferFrom](ap1.address, BrokerDealer.address, 1)

    expect(await BrokerDealer.stakedTokenId()).to.equal(1)
    expect(await BrokerDealer.stakedAddr()).to.equal(ap1.address)
    expect(await AuthorizedParticipants.ownerOf(1)).to.equal(BrokerDealer.address)

    await expectRevert(
      BrokerDealer.connect(admin).withdraw(),
      'Not owner of AP token'
    )

    await BrokerDealer.connect(ap1).withdraw()
    expect(await BrokerDealer.stakedTokenId()).to.equal(0)
    expect(await BrokerDealer.stakedAddr()).to.equal(ZERO_ADDR)
    expect(await AuthorizedParticipants.ownerOf(1)).to.equal(ap1.address)
  })

  it('BrokerDealer should allow KYC holders to use the deposited AP token (up to 1 ETH)', async () => {
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap1.address, 1)
    await AuthorizedParticipants.connect(admin)[safeTransferFrom](admin.address, ap2.address, 2)
    await AuthorizedParticipants.connect(ap1)[safeTransferFrom](ap1.address, BrokerDealer.address, 1)

    expect(ethVal(await ETF.created(1))).to.equal(0)
    expect(ethVal(await ETF.redeemed(1))).to.equal(0)

    await KYC.connect(investor).register('joe', 'schmoe')
    await KYC.connect(ap6).register('al', 'gore')

    await expectRevert(
      BrokerDealer.connect(ap6).create('joe', 'schmoe'),
      'Invalid KYC Token'
    )

    const kycId = await KYC.connect(ap6).getId('joe', 'schmoe')
    expect(ethVal(await BrokerDealer.kycCreated(kycId))).to.equal(0)
    expect(ethVal(await BrokerDealer.kycRedeemed(kycId))).to.equal(0)

    await KYC.connect(investor)[safeTransferFrom](investor.address, ap5.address, kycId)
    await expectRevert(
      BrokerDealer.connect(ap5).create('joe', 'schmoe', txValue('0.1')),
      'Invalid KYC Token'
    )
    await KYC.connect(ap5)[safeTransferFrom](ap5.address, investor.address, kycId)

    await BrokerDealer.connect(investor).create('joe', 'schmoe', txValue('0.1'))

    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(1000)

    await ETF.connect(investor).approve(BrokerDealer.address, toETH(50000000))

    const startingEthBalance = await getBalance(investor)
    await BrokerDealer.connect(investor).redeem('joe', 'schmoe', toETH(500))
    const endingEthBalance = await getBalance(investor)

    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(500)
    expect(ethVal(await ETF.created(1))).to.equal(1000)
    expect(ethVal(await ETF.redeemed(1))).to.equal(500)
    expect(ethVal(await BrokerDealer.kycCreated(kycId))).to.equal(1000)

    expect(endingEthBalance - startingEthBalance).to.be.closeTo(0.05, 0.005)

    await expectRevert(
      BrokerDealer.connect(investor).create('joe', 'schmoe', txValue('0.95')),
      'Cannot provide > 1ETH in liquidity'
    )
    await BrokerDealer.connect(investor).create('joe', 'schmoe', txValue('0.9'))


    expect(ethVal(await BrokerDealer.kycCreated(kycId))).to.equal(10000)
    expect(ethVal(await BrokerDealer.kycRedeemed(kycId))).to.equal(500)


    await ETF.connect(ap2).create(2, investor.address, txValue('.1'))

    await expectRevert(
      BrokerDealer.connect(investor).redeem('joe', 'schmoe', toETH(10000)),
      'Cannot remove > 1ETH in liquidity'
    )
    await BrokerDealer.connect(investor).redeem('joe', 'schmoe', toETH(9500))
    expect(ethVal(await ETF.balanceOf(investor.address))).to.equal(1000)
  })

})

describe('ETF.B', () => {
  beforeEach(async () => {
    _start = await snapshot()

    const signers = await ethers.getSigners()

    admin = signers[0]
    investor = signers[1]

    const ETFBFactory = await ethers.getContractFactory('ETFB', admin)
    ETFB = await ETFBFactory.deploy(ZERO_ADDR, ZERO_ADDR)
    await ETFB.deployed()


    const TimeLordBaseFactory = await ethers.getContractFactory('TimeLordBase', admin)

    TimeLordBase = await TimeLordBaseFactory.attach(
      await ETFB.timeLord()
    )

    await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)
  })
  afterEach(() => _start.restore())

  it('should mint TL to correct addr', async () => {
    expect(await TimeLordBase.ownerOf(0)).to.equal(admin.address)

    // console.log(getJsonURI(await TimeLordBase.tokenURI(0)))
  })

  it('market holidays should work', async () => {
    expect(await ETFB.isMarketOpen()).to.equal(true)

    const daysElapsed = Number((await ETFB.daysElapsed()).toString())
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed)
    expect(await ETFB.isMarketOpen()).to.equal(false)


    await expectRevert(
      ETFB.connect(admin).declareMarketHoliday(daysElapsed-1),
      'The Time Lord can only declare Market Holidays within the fiscal year'
    )

    await expectRevert(
      ETFB.connect(admin).declareMarketHoliday(daysElapsed+400),
      'The Time Lord can only declare Market Holidays within the fiscal year'
    )

    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+1)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+2)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+3)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+4)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+5)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+6)
    await ETFB.connect(admin).declareMarketHoliday(daysElapsed+7)

    await expectRevert(
      ETFB.connect(admin).declareMarketHoliday(daysElapsed+8),
      'The Time Lord can only declare 8 Market Holidays per fiscal year'
    )
  })

  // it('DST should work', async () => {
  //   await time.increaseTo(FUTURE_MONDAY_AM - 3600) // 8:30am
  //   // expect(num(await ETFB.yearsElapsed())).to.equal(10)
  //   // expect(await ETFB.isMarketOpen()).to.equal(false)
  //   expect(await ETFB.isDST()).to.equal(false)


  //   await ETFB.connect(admin).declareDST(true) // 9:30am
  //   expect(await ETFB.isDST()).to.equal(true)
  //   expect(await ETFB.isMarketOpen()).to.equal(true)


  //   await time.increase(time.duration.hours(6))
  //   await time.increase(time.duration.minutes(31)) // 4:01pm


  //   expect(await ETFB.isMarketOpen()).to.equal(false)

  //   await ETFB.connect(admin).declareDST(false) // 3:01pm
  //   expect(await ETFB.isDST()).to.equal(false)
  //   expect(await ETFB.isMarketOpen()).to.equal(true)

  //   await time.increase(time.duration.hours(1)) // 4:01
  //   expect(await ETFB.isMarketOpen()).to.equal(false)
  // })
  // it('should only trade during london market hours')
})

