import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
}

function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="min-h-dvh bg-[#F7F7F5] p-6">
      <div className="mx-auto text-[#37352F] text-left">{children}</div>
    </div>
  );
}

function PageHeading({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-[30px] font-bold text-[#37352F] leading-tight",
        className
      )}
      {...props}
    />
  );
}

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function PageHeader({ children, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-2", className)} {...props}>
      {children}
    </div>
  );
}

function PageDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[14px] text-[#9B9A97] leading-relaxed", className)}
      {...props}
    />
  );
}

function PageActions({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex w-full items-center gap-2 pt-2", className)}
      {...props}
    />
  );
}

export { PageWrapper, PageActions, PageDescription, PageHeading, PageHeader };
