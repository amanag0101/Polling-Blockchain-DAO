import React from "react";

interface FooterProps {
  organisationName: string;
}

const Footer = ({ organisationName }: FooterProps) => {
  return (
    <p className="text-xs text-center p-4">
      &copy; 2021, {organisationName}. All rights reserved.
    </p>
  );
};

export default Footer;
