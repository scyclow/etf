
// // SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./ETF.sol";
import "hardhat/console.sol";

pragma solidity ^0.8.23;


contract KYC is ERC721, ERC721Burnable, Ownable {
  using Strings for uint256;

  uint256 public totalSupply;

  ETF public etf;
  AuthorizedParticipants public ap;

  struct KYCInfo {
    string firstName;
    string lastName;
    address addr;
  }
  mapping(uint256 => KYCInfo) public kycInfo;

  uint256 public startTime;
  bool isLocked;


  constructor(address _etf, address _ap) ERC721('KYC', 'KYC') {
    etf = ETF(_etf);
    ap = AuthorizedParticipants(_ap);

    startTime = block.timestamp;
  }

  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }

  function mint(string memory firstName, string memory lastName) external payable {
    require(etf.marketIsOpen(), 'KYC mint unavailable');
    require(bytes(firstName).length != 0 && bytes(lastName).length != 0, 'Invalid KYC info');
    require(msg.value >= 0.01 ether, 'Must pay KYC fee');

    uint256 id = getId(firstName, lastName);
    require(bytes(kycInfo[id].firstName).length == 0, 'KYC already registered');

    kycInfo[id].firstName = firstName;
    kycInfo[id].lastName = lastName;
    kycInfo[id].addr = msg.sender;

    payable(owner()).transfer(msg.value);
    _safeMint(msg.sender, id);
    totalSupply++;
  }

  function getId(string memory firstName, string memory lastName) public view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(firstName, lastName)));
  }

  string public externalUrl = "https://steviep.xyz/etf";
  string public description = "Always know your customer";


  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(rawSVG(tokenId))
    );


    string memory addr = Strings.toHexString(uint256(uint160(kycInfo[tokenId].addr)), 20);

    bytes memory attrs = abi.encodePacked(
      '[',
      '{"trait_type": "First Name", "value": "', kycInfo[tokenId].firstName, '"},',
      '{"trait_type": "Last Name", "value": "', kycInfo[tokenId].lastName, '"},',
      '{"trait_type": "Address", "value": "', addr, '"}',
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
    string memory addr = Strings.toHexString(uint256(uint160(kycInfo[tokenId].addr)), 20);

    return abi.encodePacked(
      '<svg viewBox="0 0 380 250" xmlns="http://www.w3.org/2000/svg">'
        '<style>.k{dominant-baseline:middle;text-anchor:middle;font-size:40px}.n{fill:#e74d61;font-family:monospace;font-size:30px}.a{fill:#e74d61;font-family:monospace;font-size:11px}</style>'
        '<rect x="0" y="0" width="380" height="250" fill="#f1f1d1"></rect>'
        '<rect x="10" y="10" width="360" height="230" stroke="#002150" fill="none" rx="15"></rect>'
        '<rect x="15" y="15" width="350" height="220" stroke="#002150" fill="none" rx="15"></rect>'
        '<rect x="15" y="15" width="350" height="50" fill="#4368a2" rx="15" stroke="#002150"></rect>'
        '<rect x="15.5" y="50" width="349" height="15" fill="#4368a2" ></rect>'
        '<line x1="15" y1="65" x2="365" y2="65" stroke="#002150"></line>'
        '<text x="192" y="47" class="k" fill="#082262">KYC</text>'
        '<text x="191" y="46" class="k" fill="#082262">KYC</text>'
        '<text x="190" y="45" class="k" fill="#fbf7ed" stroke="#002150">KYC</text>'
        '<text class="n k" x="50%" y=119>', kycInfo[tokenId].firstName, '</text>'
        '<text class="n k" x="50%" y=156>', kycInfo[tokenId].lastName, '</text>'
        '<text class="a k" x="50%" y=210>', addr, '</text>'
      '</svg>'
    );
  }
}



contract APProxy  {
  KYC public kyc;
  ETF public etf;
  AuthorizedParticipants public ap;

  mapping(uint256 => uint256) public kycMinted;

  uint256 public stakedTokenId;
  address public stakedAddr;


  constructor(address _etf, address _ap, address _kyc) {
    etf = ETF(_etf);
    ap = AuthorizedParticipants(_ap);
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


}