import React from "react";

interface TableRowProps {
  className?: string;
  data: string | React.ReactNode;
}

export const TableRow = ({
  className = "bg-[#1f1f1f]",
  data,
}: TableRowProps) => {
  return <tr className={`${className}`}>{data}</tr>;
};
