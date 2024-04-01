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

  await time.increaseTo(ARBITRARY_MARKET_OPEN_TIME)

  const signers = await ethers.getSigners()

  minter = signers[0]
  ap0 = signers[1]
  ap1 = signers[2]
  ap2 = signers[3]
  ap3 = signers[4]
  ap4 = signers[5]
  ap5 = signers[6]



  const ETFFactory = await ethers.getContractFactory('ETF', minter)
  ETF = await ETFFactory.deploy()
  await ETF.deployed()

  const AuthorizedParticipantFactory = await ethers.getContractFactory('AuthorizedParticipants', minter)

  AuthorizedParticipants = await AuthorizedParticipantFactory.attach(
    await ETF.authorizedParticipants()
  )

  const KYCFactory = await ethers.getContractFactory('KYC', minter)
  KYC = await KYCFactory.deploy(ETF.address, AuthorizedParticipants.address)
  await KYC.deployed()

  await KYC.connect(ap0).mint('joe', 'schmoe', txValue('0.01'))

  const kycId = await KYC.connect(ap0).getId(ap0.address)

  console.log(kycId)

  console.log(getJsonURI(await KYC.connect(ap0).tokenURI(kycId)))



  const SteviepAuctionFactory = await ethers.getContractFactory('SteviepAuctionV1', minter)
  // SteviepAuction = await SteviepAuctionFactory.attach('0xd577B12732DA7557Db7eeA82e53d605f42C618d8')
  SteviepAuction = await SteviepAuctionFactory.deploy()
  await SteviepAuction.deployed()

  const RewardMockFactory = await ethers.getContractFactory('RewardMock', minter)
  RewardMock = await RewardMockFactory.deploy()
  await RewardMock.deployed()



  // await AuthorizedParticipants.connect(minter).mint(minter.address, 0)
  // await AuthorizedParticipants.connect(minter).mint(minter.address, 1)
  // await AuthorizedParticipants.connect(minter).mint(minter.address, 2)
  // await AuthorizedParticipants.connect(minter).mint(minter.address, 3)
  // await AuthorizedParticipants.connect(minter).mint(minter.address, 4)
  // await AuthorizedParticipants.connect(minter).mint(minter.address, 5)

  await AuthorizedParticipants.connect(minter).setApprovalForAll(SteviepAuction.address, true)





  for (let i = 0; i < 6; i++) {

    await SteviepAuction.connect(minter).create(
      true,
      300, // duration -> 5 min
      1000, // price increase -> 10%
      60, // extension -> 1min
      '0', // min bid
      i, // tokenId
      minter.address, // beneficiary
      false, // transfer from minter to winner
      AuthorizedParticipants.address,
      RewardMock.address, // reward
      KYC.address, // allow list
    )
  }



  console.log(`ETF:`, ETF.address)
  console.log(`AuthorizedParticipants:`, AuthorizedParticipants.address)
  console.log(`KYC:`, KYC.address)
  console.log(`SteviepAuction:`, SteviepAuction.address)
  console.log(`AP0:`, ap0.address)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });