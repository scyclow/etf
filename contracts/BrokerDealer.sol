// SPDX-License-Identifier: MIT


pragma solidity ^0.8.23;

interface IETF {
  function create(uint256, address) external payable;
  function redeem(uint256, address, uint256) external;
  function transferFrom(address, address, uint256) external returns (bool);
}

interface IAuthorizedParticipants {
  function safeTransferFrom(address, address, uint256) external;
}

interface IKYC {
  function getId(string memory, string memory) external view returns (uint256);
  function getAddr(uint256) external view returns (address);
  function ownerOf(uint256) external view returns (address);
}

contract BrokerDealer  {
  IKYC public kyc;
  IETF public etf;
  IAuthorizedParticipants public ap;

  mapping(uint256 => uint256) public kycCreated;
  mapping(uint256 => uint256) public kycRedeemed;
  mapping(uint256 => uint256) _kycLimit;

  uint256 public stakedTokenId;
  address public stakedAddr;

  bool public redeemEnabled = true;
  bool public createEnabled = true;


  constructor(address _etf, address _ap, address _kyc) {
    etf = IETF(_etf);
    ap = IAuthorizedParticipants(_ap);
    kyc = IKYC(_kyc);
  }

  function kycLimit(uint256 tokenId) public view returns (uint256) {
    return (_kycLimit[tokenId] > 0) ? _kycLimit[tokenId] : 10000 ether;
  }


  function create(string memory firstName, string memory lastName) external payable {
    require(createEnabled, 'Share creation disabled');
    uint256 kycTokenId = kyc.getId(firstName, lastName);

    require(
      kyc.ownerOf(kycTokenId) == msg.sender
      && kyc.getAddr(kycTokenId) == msg.sender,
      'Invalid KYC Token'
    );

    uint256 tokensToCreate = msg.value * 10000;
    require(kycCreated[kycTokenId] + tokensToCreate <= kycLimit(kycTokenId), 'Cannot provide > 1ETH in liquidity');

    kycCreated[kycTokenId] += tokensToCreate;

    etf.create{value: msg.value}(stakedTokenId, msg.sender);
  }

  function redeem(string memory firstName, string memory lastName, uint256 etfAmount) external payable {
    require(redeemEnabled, 'Share redeemption disabled');
    uint256 kycTokenId = kyc.getId(firstName, lastName);

    require(
      kyc.ownerOf(kycTokenId) == msg.sender
      && kyc.getAddr(kycTokenId) == msg.sender,
      'Invalid KYC Token'
    );

    require(kycRedeemed[kycTokenId] + etfAmount <= kycLimit(kycTokenId), 'Cannot remove > 1ETH in liquidity');

    kycRedeemed[kycTokenId] += etfAmount;


    etf.transferFrom(msg.sender, address(this), etfAmount);
    etf.redeem(stakedTokenId, msg.sender, etfAmount);
  }


  // deposit
  function onERC721Received(
    address,
    address from,
    uint256 tokenId,
    bytes calldata
  ) external returns (bytes4) {
    require(msg.sender == address(ap), 'Not an AP token');
    require(stakedTokenId == 0, 'Cannot stake multiple AP tokens');
    require(tokenId != 0, 'Cannot stake the Time Lord');

    stakedAddr = from;
    stakedTokenId = tokenId;

    return this.onERC721Received.selector;
  }

  function withdraw() external {
    require(stakedAddr == msg.sender, 'Not owner of AP token');
    stakedAddr = address(0);

    ap.safeTransferFrom(address(this), msg.sender, stakedTokenId);
    stakedTokenId = 0;
  }


  function setCreateEnabled(bool value) external {
    require(stakedAddr == msg.sender, 'Not owner of AP token');
    createEnabled = value;
  }

  function setRedeemEnabled(bool value) external {
    require(stakedAddr == msg.sender, 'Not owner of AP token');
    redeemEnabled = value;
  }

  function setKYCLimit(uint256 tokenId, uint256 value) external {
    require(stakedAddr == msg.sender, 'Not owner of AP token');
    _kycLimit[tokenId] = value;
  }
}

