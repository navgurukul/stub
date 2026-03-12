import { cn } from "@/lib/utils";

interface PageWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function PageWrapper({ children, className, ...props }: PageWrapperProps) {
  return (
    <div
      className={cn("min-h-dvh bg-secondary-background p-6", className)}
      {...props}
    >
      <div className="mx-auto h-full text-foreground text-left">{children}</div>
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
        "text-[30px] font-bold text-foreground leading-tight",
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
      className={cn(
        "text-[14px] text-muted-foreground leading-relaxed",
        className
      )}
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
