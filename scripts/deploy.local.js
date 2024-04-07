const { time } = require('@openzeppelin/test-helpers')

const ONE_DAY = 60 * 60 * 24
const TEN_MINUTES = 60 * 10
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
const safeTransferFrom = 'safeTransferFrom(address,address,uint256)'

const ARBITRARY_MARKET_OPEN_TIME = 2020429800

const toETH = amt => ethers.utils.parseEther(String(amt))
const txValue = amt => ({ value: toETH(amt) })

const utf8Clean = raw => raw.replace(/data.*utf8,/, '')
const getJsonURI = rawURI => JSON.parse(utf8Clean(rawURI))


async function main() {

  await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)

  const signers = await ethers.getSigners()

  admin = signers[0]




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

  await AuthorizedParticipants[safeTransferFrom](admin.address, BrokerDealer.address, 1)

  await BrokerDealer.connect(admin).setRedeemEnabled(false)
  console.log(await BrokerDealer.connect(admin).redeemEnabled())

  await KYC.connect(admin).register('joe', 'schmoe')
  const kycId = await KYC.connect(admin).getId('joe', 'schmoe')


  console.log(kycId)

  console.log(getJsonURI(await KYC.connect(admin).tokenURI(kycId)))

  const SteviepAuctionFactory = await ethers.getContractFactory('SteviepAuctionV1', admin)
  // SteviepAuction = await SteviepAuctionFactory.attach('0xd577B12732DA7557Db7eeA82e53d605f42C618d8')
  SteviepAuction = await SteviepAuctionFactory.deploy()
  await SteviepAuction.deployed()

  const RewardMockFactory = await ethers.getContractFactory('RewardMock', admin)
  RewardMock = await RewardMockFactory.deploy()
  await RewardMock.deployed()




  await AuthorizedParticipants.connect(admin).setApprovalForAll(SteviepAuction.address, true)
  console.log(await AuthorizedParticipants.isApprovedForAll(admin.address, SteviepAuction.address), '<<<<<<<<<<<<<<<<<')



  // for (let i = 0; i < 7; i++) {
  //   if (i !== 1) {
  //     await SteviepAuction.connect(admin).create(
  //       true,
  //       300, // duration -> 5 min
  //       1000, // price increase -> 10%
  //       60, // extension -> 1min
  //       '0', // min bid
  //       i, // tokenId
  //       admin.address, // beneficiary
  //       false, // transfer from admin to winner
  //       AuthorizedParticipants.address,
  //       RewardMock.address, // reward
  //       ZERO_ADDR// KYC.address, // allow list
  //     )
  //   }

  // }



  console.log(`ETF:`, ETF.address)
  console.log(`AuthorizedParticipants:`, AuthorizedParticipants.address)
  console.log(`KYC:`, KYC.address)
  console.log(`BrokerDealer:`, BrokerDealer.address)
  console.log(`SteviepAuction:`, SteviepAuction.address)

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });