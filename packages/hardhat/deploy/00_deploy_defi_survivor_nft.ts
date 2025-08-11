import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployWithAA } from "../utils/deployWithAA";

/**
 * Deploys a contract named "DeFiSurvivorNFT" using a smart account associated to SIGNING_KEY, if provided,
 * or else a random signing key will be used
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
export const CONTRACT_NAME = "DeFiSurvivorNFT";
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const factory = await hre.ethers.getContractFactory(CONTRACT_NAME);

  // Get the deployer address for the initialOwner parameter
  const [deployer] = await hre.ethers.getSigners();
  console.log("🎮 Deploying DeFi Survivor NFT contract...");
  console.log("📝 Initial owner will be:", deployer.address);

  // Use account abstraction to deploy the contract, with the gas sponsored for us!
  const nftAddress = await deployWithAA(factory, CONTRACT_NAME, hre, [deployer.address]);

  const nft = await hre.ethers.getContractAt(CONTRACT_NAME, nftAddress);
  console.log("🎯 DeFi Survivor NFT deployed to:", nftAddress);
  console.log("👑 Contract owner:", await nft.owner());
  console.log("🏷️ NFT name:", await nft.name());
  console.log("🔤 NFT symbol:", await nft.symbol());
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags DeFiSurvivorNFT
deployYourContract.tags = ["DeFiSurvivorNFT"];