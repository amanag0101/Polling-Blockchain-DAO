import { ethers } from "ethers";

export const convertToInteger = (value: string): number => {
  return parseInt(ethers.formatUnits(value, 0));
};

export const convertToEther = (value: string): number => {
  return parseFloat(ethers.formatEther(value));
};

export const convertEpochSecondsToDate = (epochSeconds: number): string => {
  let date = new Date(0);
  date.setUTCSeconds(epochSeconds);
  return date.toLocaleString();
};
