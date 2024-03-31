const AUCTION_STRUCT = `(
  bool tokenExists,
  uint256 duration,
  uint256 bidIncreaseBps,
  uint256 bidTimeExtension,
  uint256 minBid,
  uint256 tokenId,
  uint256 startTime,
  address beneficiary,
  bool approveFutureTransfer,
  address minterContract,
  address rewardContract,
  address allowListContract
)`

CONTRACTS = {
  ETF: {
    addr: {
      local: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    },
    abi: [
      'function balanceOf(address owner) external view returns (uint256 balance)',
      'function created(uint256 tokenId) external view returns (uint256)',
      'function redeemed(uint256 tokenId) external view returns (uint256)',
      'function totalSupply() external view returns (uint256)',
      'function transfer(address, uint256) external',
      'function create(uint256, address) external payable',
      'function redeem(uint256,  address, uint256) external',
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ],
  },
  AP: {
    addr: {
      local: '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be'
    },
    abi: [
      'function ownerOf(uint256 tokenId) external view returns (address)',
    ]
  },
  KYC: {
    addr: {
      local: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    },
    abi: [
      'function balanceOf(address) external view returns (uint256)'
    ]
  },
  AUCTION: {
    addr: {
      local: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      mainnet: '0xd577B12732DA7557Db7eeA82e53d605f42C618d8'
    },
    abi: [
      'event BidMade(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 timestamp)',
      'function auctionCount() external view returns (uint256)',
      'function auctionIdToHighestBid(uint256) external view returns (uint256 amount, uint256 timestamp, address bidder)',
      'function auctionEndTime(uint256) external view returns (uint256 endTime)',
      `function auctionIdToAuction(uint256) external view returns (${AUCTION_STRUCT})`,
      'function isActive(uint256 auctionId) external view returns (bool)',
      'function isSettled(uint256 auctionId) external view returns (bool)',
      'function bid(uint256 auctionId, bool wantsReward) external payable',
      'function settle(uint256 auctionId) external payable',
    ]
  }
}