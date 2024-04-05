const { time } = require('@openzeppelin/test-helpers')

const ONE_DAY = 60 * 60 * 24
const TEN_MINUTES = 60 * 10
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const ARBITRARY_MARKET_OPEN_TIME = 1894118400

const toETH = amt => ethers.utils.parseEther(String(amt))
const txValue = amt => ({ value: toETH(amt) })

const utf8Clean = raw => raw.replace(/data.*utf8,/, '')
const getJsonURI = rawURI => JSON.parse(utf8Clean(rawURI))


async function main() {

  // await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)

  const signers = await ethers.getSigners()
  admin = signers[0]

  const ETFFactory = await ethers.getContractFactory('ETF', admin)
  const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipants', admin)
  const KYCFactory = await ethers.getContractFactory('KYC', admin)
  const BrokerDealerFactory = await ethers.getContractFactory('BrokerDealer', admin)




  // ETF = await ETFFactory.attach('0x16bEB2B655F35Cd2dA6bF73940569e556AeC8312')
  // AuthorizedParticipants = await AuthorizedParticipantFactory.attach('0x092d024dfFA03a397D8094e7472499090838Ed90')
  // KYC = await KYCFactory.attach('0x8F71C240a2A3a52dF514651537bbb104479d7DbF')
  // BrokerDealer = await BrokerDealerFactory.attach('0x572270335c444944BB201a8f518C6D94a97082AF')

  // console.log(await KYC.tokenURI('114456120529443410500947975745377877582060805358281625822537665062017013753692'))


  ETF = await ETFFactory.deploy()
  await ETF.deployed()


  AuthorizedParticipants = await AuthorizedParticipantFactory.attach(
    await ETF.authorizedParticipants()
  )
  KYC = await KYCFactory.deploy(ETF.address)
  await KYC.deployed()


  BrokerDealer = await BrokerDealerFactory.deploy(ETF.address, AuthorizedParticipants.address, KYC.address)
  await BrokerDealer.deployed()

  await AuthorizedParticipants.transferFrom(admin.address, BrokerDealer.address, 1)

  await KYC.connect(admin).register('joe', 'schmoe', txValue('0.01'))

  const kycId = await KYC.connect(admin).getId('joe', 'schmoe')


  console.log(kycId)

  // console.log(getJsonURI(await KYC.connect(admin).tokenURI(kycId)))

  const SteviepAuctionFactory = await ethers.getContractFactory('SteviepAuctionV1', admin)
  SteviepAuction = await SteviepAuctionFactory.deploy()
  await SteviepAuction.deployed()

  const RewardMockFactory = await ethers.getContractFactory('RewardMock', admin)
  RewardMock = await RewardMockFactory.deploy()
  await RewardMock.deployed()


  console.log(`ETF:`, ETF.address)
  console.log(`AuthorizedParticipants:`, AuthorizedParticipants.address)
  console.log(`KYC:`, KYC.address)
  console.log(`BrokerDealer:`, BrokerDealer.address)
  console.log(`SteviepAuction:`, SteviepAuction.address)


  try {

    await AuthorizedParticipants.connect(admin).setApprovalForAll(SteviepAuction.address, true)
    await AuthorizedParticipants.connect(admin).setApprovalForAll(SteviepAuction.address, true)
    await AuthorizedParticipants.connect(admin).setApprovalForAll(SteviepAuction.address, true)
    console.log(await AuthorizedParticipants.isApprovedForAll(admin.address, SteviepAuction.address), '<<<<<<<<<<<<<<<<<')
  } catch (e) {
    console.log(e)
  }



  for (let i = 5; i < 7; i++) {

    await SteviepAuction.connect(admin).create(
      true,
      300, // duration -> 5 min
      1000, // price increase -> 10%
      60, // extension -> 1min
      '0', // min bid
      i, // tokenId
      admin.address, // beneficiary
      false, // transfer from admin to winner
      AuthorizedParticipants.address,
      RewardMock.address, // reward
      KYC.address, // allow list
    )
  }



}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });