
// // SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./ETF.sol";

pragma solidity ^0.8.23;


contract KYC is ERC721, Ownable {
  uint256 public totalSupply;

  ETF public etf;
  AuthorizedParticipant public ap;
  KYCTokenURI public tokenURIContract;

  struct KYCInfo {
    string firstName;
    string lastName;
  }
  mapping(uint256 => KYCInfo) public kycInfo;

  uint256 public startTime;
  bool isLocked;


  constructor(address _etf, address _ap) ERC721('KYC', 'KYC') {
    etf = ETF(_etf);
    ap = AuthorizedParticipant(_ap);

    startTime = block.timestamp;
    tokenURIContract = new KYCTokenURI();
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function mint(string memory firstName, string memory lastName) external payable {
    require(etf.marketIsOpen(), 'KYC mint unavailable');
    require(bytes(firstName).length != 0 && bytes(lastName).length != 0, 'Invalid KYC info');
    require(msg.value >= 0.01 ether, 'Must pay KYC fee');

    uint256 info = uint256(keccak256(abi.encodePacked(firstName, lastName)));
    require(bytes(kycInfo[info].firstName).length == 0, 'KYC already registered');

    kycInfo[info].firstName = firstName;
    kycInfo[info].lastName = lastName;

    payable(owner()).transfer(msg.value);
    _safeMint(msg.sender, uint256(uint160(msg.sender)));
    totalSupply++;
  }
}



contract APProxy  {
  KYC public kyc;
  ETF public etf;
  AuthorizedParticipant public ap;

  mapping(uint256 => uint256) public kycMinted;

  uint256 public stakedTokenId;
  address public stakedAddr;


  constructor(address _etf, address _ap, address _kyc) {
    etf = ETF(_etf);
    ap = AuthorizedParticipant(_ap);
    kyc = KYC(_kyc);
  }


  receive() external payable {
    uint256 tokenId = uint256(uint160(msg.sender));
    require(kyc.ownerOf(tokenId) == msg.sender, 'Invalid KYC Token');
    require(kycMinted[tokenId] + msg.value <= 1 ether, 'Cannot provide > 1ETH in liquidity');

    kycMinted[tokenId] += msg.value;

    etf.create{value: msg.value}(0, msg.sender);
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

    stakedAddr = from;
    stakedTokenId = tokenId;

    return this.onERC721Received.selector;
  }

  function withdraw(uint256 tokenId) external {
    require(stakedAddr == msg.sender);
    stakedAddr = address(0);

    ap.safeTransferFrom(address(this), msg.sender, tokenId);
    stakedTokenId = 0;
  }
}


contract KYCTokenURI {
  using Strings for uint256;

  string public externalUrl = "https://steviep.xyz/etf";
  string public description = "";

  KYC public kyc;

  constructor() {
    kyc = KYC(msg.sender);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(rawSVG(tokenId))
    );


    (string memory firstName, string memory lastName) =  kyc.kycInfo(tokenId);
    string memory attrs = string.concat(
      '[',
      '{"trait_type": "First Name", "value": "', firstName, '"},',
      '{"trait_type": "Last Name", "value": "', lastName, '"}',
      ']'
    );


    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": " Authorized Participant ', tokenId.toString(), '",',
      '"description": "', description, '",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );
    return string(json);
  }

  function rawSVG(uint256 tokenId) public view returns (bytes memory) {
    (string memory firstName, string memory lastName) =  kyc.kycInfo(tokenId);


    /*
      blue rect, same color as ssn card
      header: darker blue rect with lighter KYC
      blue border
      body:
        First Name: ...
        Last Name: ...

        rosette stamp based on id?
        address/tokenId

    */

    return abi.encodePacked(
      '<svg viewBox="0 0 380 250" xmlns="http://www.w3.org/2000/svg">'
        // '<style>'
        //   'text{font-family:monospace;fill:#',params[tokenId][0],';font-size:180px}'
        //   'rect{fill:#',params[tokenId][1],';stroke:#',params[tokenId][0],';stroke-width:35px}'
        // '</style>'
        // '<rect x="0" y="0" width="380" height="250"></rect>'
        // '<text class="fillLight" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">AP',tokenId.toString(),'</text>'
      '</svg>'
    );
  }

}