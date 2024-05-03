import React, { useContext, useEffect, useRef, useState } from "react";
import Skeleton from "./ui/skeleton";
import { Contract } from "ethers";
import { convertToEther, convertToInteger } from "../utils/utils";
import { ToastContext } from "../context/toast-context";

interface HeaderProps {
  contract: Contract;
  organisationName: string;
  ownerAddress: string;
  userAddress: string;
  userName: string;
  userRole: string;
}

const Header = ({
  contract,
  organisationName,
  ownerAddress,
  userAddress,
  userName,
  userRole,
}: HeaderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { setToast, setToastKey } = useContext(ToastContext);

  const [loading, setLoading] = useState(false);
  const [taskApprovalPercentage, setTaskApprovalPercentage] =
    useState<number>(-1);
  const [minimumStakingAmount, setMinimumStakingAmount] = useState<number>(-1);
  const [vestingPeriodInDays, setVestingPeriodInDays] = useState<number>(-1);
  const [balance, setBalance] = useState<number>(-1);

  const getData = async () => {
    try {
      setLoading(true);

      const taskApprovalPercentage = await contract
        .taskApprovalPercentage()
        .then((value) => convertToInteger(value));

      const minimumStakingAmount = await contract
        .minimumStakingAmount()
        .then((value) => convertToEther(value));

      const vestingPeriodInDays = await contract
        .vestingPeriodInDays()
        .then((value) => convertToInteger(value));

      const balance = await contract
        .getBalance()
        .then((value) => convertToEther(value));

      setTaskApprovalPercentage(taskApprovalPercentage);
      setMinimumStakingAmount(minimumStakingAmount);
      setVestingPeriodInDays(vestingPeriodInDays);
      setBalance(balance);

      setLoading(false);
    } catch (error: any) {
      console.error(error);
      setToast({
        message: error?.reason || error?.message || "Some error occurred.",
        type: "error",
      });
      setToastKey((prev) => prev + 1);
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [contract]);

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-12 p-4">
      {loading ? (
        <Skeleton height={containerRef?.current?.clientHeight} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div>
              <p>{organisationName}</p>
              <p className="text-[#fd7500]">{ownerAddress}</p>
            </div>

            <div>
              <p>
                {userName} {`(${userRole})`}
              </p>
              <p className="text-[#fd7500]">{userAddress}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:gap-0 md:flex-row flex-1 justify-between">
            <div className="text-center">
              <p className="text-gray-500 text-sm">Vesting period</p>
              <p className="text-[#ffe821]">{vestingPeriodInDays} days</p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-sm">Task approval percentage</p>
              <p className="text-[#ffe821]">{taskApprovalPercentage} %</p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-sm">Minimum staking amount</p>
              <p className="text-[#ffe821]">{minimumStakingAmount} ETH</p>
            </div>

            <div className="text-[#ffe821] text-center">
              <p className="text-gray-500 text-sm">Contract balance</p>
              <p>{balance} ETH</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Header;
