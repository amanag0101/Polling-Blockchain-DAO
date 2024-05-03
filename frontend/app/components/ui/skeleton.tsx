interface SkeletonProps {
  className?: string;
  height?: number;
}

const Skeleton = ({ className = "", height = 320 }: SkeletonProps) => {
  return (
    <div className={`h-full w-full grid grid-rows-auto gap-4 ${className}`}>
      {[...Array(Math.round(height / 32))].map((_, index) => (
        <div key={index} className="shimmer-animation h-8"></div>
      ))}
    </div>
  );
};

export default Skeleton;
