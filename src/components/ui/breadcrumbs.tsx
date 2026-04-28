import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

export default function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-slate-200 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-slate-200" : ""}>{item.label}</span>
              )}

              {!isLast && <span className="text-slate-600">/</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
