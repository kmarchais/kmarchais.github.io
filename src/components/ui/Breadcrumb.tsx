import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => (
  <nav aria-label="Breadcrumb" className="px-6 py-2 text-sm">
    <ol className="flex items-center gap-1.5">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg className="w-3.5 h-3.5 text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast || !item.path ? (
              <span aria-current={isLast ? 'page' : undefined} className="text-tertiary">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="text-secondary hover:text-tertiary transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumb;
