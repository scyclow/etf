const ONE_DAY = 60 * 60 * 24
const TEN_MINUTES = 60 * 10
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

async function main() {
  const signers = await ethers.getSigners()

  admin = signers[0]
  bidder1 = signers[1]
  bidder2 = signers[2]

  const SteviepAuctionFactory = await ethers.getContractFactory('SteviepAuctionV1', admin)
  SteviepAuction = await SteviepAuctionFactory.deploy()
  await SteviepAuction.deployed()

  const ColdHardCashFactory = await ethers.getContractFactory('ColdHardCash', admin)
  ColdHardCash = await ColdHardCashFactory.deploy()
  await ColdHardCash.deployed()

  const RewardMinterMockFactory = await ethers.getContractFactory('RewardMinterMock', admin)
  RewardMinterMock = await RewardMinterMockFactory.deploy()
  await RewardMinterMock.deployed()

  const AllowListMockFactory = await ethers.getContractFactory('AllowListMock', admin)
  AllowListMock = await AllowListMockFactory.deploy()
  await AllowListMock.deployed()


  const UniswapV2MockFactory = await ethers.getContractFactory('UniswapV2Mock', admin)
  UniswapV2Mock = await UniswapV2MockFactory.deploy()
  await UniswapV2Mock.deployed()

  await ColdHardCash.connect(admin).setMinter(SteviepAuction.address)



  for (let i = 0; i < 16; i++) {
    await SteviepAuction.connect(admin).create(
      false,
      300,
      1000,
      300,
      '100000000000000000',
      i,
      admin.address,
      false,
      ColdHardCash.address,
      RewardMinterMock.address,
      AllowListMock.address,
    )
  }
  await AllowListMock.connect(admin).setBalance(admin.address, 1)


  console.log(`SteviepAuction:`, SteviepAuction.address)
  console.log(`ColdHardCash:`, ColdHardCash.address)
  console.log(`UniswapV2Mock:`, UniswapV2Mock.address)
  console.log(`AllowListMock:`, AllowListMock.address)
  console.log('admin:', admin.address)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });