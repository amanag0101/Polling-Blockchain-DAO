interface TableDataProps {
  className?: string;
  data: string | React.ReactNode;
}

export const TableBodyData = ({ className = "", data }: TableDataProps) => {
  return <td className={`p-3 ${className}`}>{data}</td>;
};
