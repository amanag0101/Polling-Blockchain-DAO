"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Director from "./components/director";
import Footer from "./components/footer";
import Header from "./components/header";
import Stakeholder from "./components/stakeholder";
import Task from "./components/task";
import { ethers, Contract } from "ethers";
import { env } from "../env";
import { abi } from "../contract/abi";
import Skeleton from "./components/ui/skeleton";
import { ToastContext } from "./context/toast-context";
import { Signer } from "ethers";

export default function Home() {
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const { setToast, setToastKey } = useContext(ToastContext);

  const [loading, setLoading] = useState(false);
  const [reloadHeader, setReloadHeader] = useState(false);

  const [contract, setContract] = useState<Contract>();
  const [signer, setSigner] = useState<Signer>();
  const [organisationName, setOrganisationName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [ownerAddress, setOwnerAddress] = useState<string>("0x");
  const [userAddress, setUserAddress] = useState<string>("0x");
  const [userRole, setUserRole] = useState<string>("");

  const connectWallet = async (account = null) => {
    if (!window.ethereum) {
      setToast({
        message: "Please install MetaMask extension to use this application.",
        timeout: 5000,
        type: "error",
      });
      setToastKey((prev) => prev + 1);
      return;
    }

    try {
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = account
        ? await provider.getSigner(account)
        : await provider.getSigner();
      const contract = new Contract(env.contractAddress, abi, signer);

      setContract(contract);
      setSigner(signer);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const getData = async (contract: Contract, signer: Signer) => {
    try {
      setLoading(true);

      const organisationName = await contract.organisationName();
      const owner = await contract.owner();
      const userAddress = await signer.getAddress();
      const userName = await contract.getUserName(userAddress);
      const userRole = await contract.getRole(userAddress);

      setOrganisationName(organisationName);
      setUserName(userName);
      setOwnerAddress(owner[0]);
      setUserAddress(userAddress);
      setUserRole(userRole);

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
    if (contract && signer) {
      getData(contract, signer);
    }
  }, [contract, signer, reloadHeader]);

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountChange = async () => {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          connectWallet(accounts[0]);
        } else {
          setContract(undefined);
          setSigner(undefined);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountChange);

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountChange);
      };
    } else {
      setContract(undefined);
      setSigner(undefined);
    }
  }, []);

  return (
    <main
      ref={mainContainerRef}
      className="flex flex-col flex-1 gap-2 p-2 min-h-[100vh] overflow-hidden"
    >
      {loading ? (
        <Skeleton height={mainContainerRef?.current?.clientHeight} />
      ) : contract ? (
        <>
          <div className="bg-[#181818]">
            <Header
              contract={contract}
              organisationName={organisationName}
              ownerAddress={ownerAddress}
              userAddress={userAddress}
              userName={userName}
              userRole={userRole}
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <div className="bg-[#181818] w-full lg:w-1/2">
              <Director contract={contract} userRole={userRole} />
            </div>

            <div className="bg-[#181818] w-full lg:w-1/2 overflow-auto">
              <Stakeholder
                contract={contract}
                userRole={userRole}
                setReloadHeader={setReloadHeader}
              />
            </div>
          </div>

          <div className="bg-[#181818] flex flex-col flex-1">
            <Task contract={contract} userRole={userRole} />
          </div>

          <div className="bg-[#181818]">
            <Footer organisationName={organisationName} />
          </div>
        </>
      ) : (
        <div className="flex flex-col flex-1 items-center justify-center gap-4">
          <button className="bg-[#33bcb0] p-2" onClick={() => connectWallet()}>
            Connect Wallet
          </button>
        </div>
      )}
    </main>
  );
}
