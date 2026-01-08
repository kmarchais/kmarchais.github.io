import type { ComponentPropsWithoutRef } from 'react';

type HeadingProps = ComponentPropsWithoutRef<'h1'>;
type ParagraphProps = ComponentPropsWithoutRef<'p'>;
type PreProps = ComponentPropsWithoutRef<'pre'>;
type CodeProps = ComponentPropsWithoutRef<'code'>;
type ListProps = ComponentPropsWithoutRef<'ul'>;
type ListItemProps = ComponentPropsWithoutRef<'li'>;
type AnchorProps = ComponentPropsWithoutRef<'a'>;
type ImageProps = ComponentPropsWithoutRef<'img'>;
type BlockquoteProps = ComponentPropsWithoutRef<'blockquote'>;
type TableProps = ComponentPropsWithoutRef<'table'>;
type TheadProps = ComponentPropsWithoutRef<'thead'>;
type ThProps = ComponentPropsWithoutRef<'th'>;
type TdProps = ComponentPropsWithoutRef<'td'>;

const MDXComponents = {
  h1: (props: HeadingProps) => <h1 className="text-white font-bold text-3xl mt-8 mb-4" {...props} />,
  h2: (props: HeadingProps) => <h2 className="text-white font-bold text-2xl mt-8 mb-3" {...props} />,
  h3: (props: HeadingProps) => <h3 className="text-white font-bold text-xl mt-6 mb-2" {...props} />,
  h4: (props: HeadingProps) => <h4 className="text-white font-bold text-lg mt-4 mb-2" {...props} />,
  p: (props: ParagraphProps) => <p className="text-tertiary text-base leading-relaxed mb-4" {...props} />,

  pre: (props: PreProps) => (
    <pre className="bg-black-100 rounded-lg p-4 overflow-x-auto mb-4 text-sm" {...props} />
  ),
  code: ({ className, children, ...props }: CodeProps) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-black-100 text-tertiary px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    }
    return <code className={className} {...props}>{children}</code>;
  },

  ul: (props: ListProps) => <ul className="text-tertiary list-disc ml-6 mb-4 space-y-1" {...props} />,
  ol: (props: ListProps) => <ol className="text-tertiary list-decimal ml-6 mb-4 space-y-1" {...props} />,
  li: (props: ListItemProps) => <li className="text-tertiary" {...props} />,

  a: (props: AnchorProps) => (
    <a className="text-secondary hover:text-white underline transition-colors" {...props} />
  ),

  img: (props: ImageProps) => (
    <img className="rounded-lg my-6 max-w-full mx-auto" {...props} />
  ),

  blockquote: (props: BlockquoteProps) => (
    <blockquote className="border-l-4 border-secondary pl-4 italic text-tertiary my-4" {...props} />
  ),

  table: (props: TableProps) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full text-tertiary border-collapse" {...props} />
    </div>
  ),
  thead: (props: TheadProps) => <thead className="border-b border-secondary" {...props} />,
  th: (props: ThProps) => <th className="px-4 py-2 text-left text-white font-semibold" {...props} />,
  td: (props: TdProps) => <td className="border-b border-black-100 px-4 py-2" {...props} />,

  hr: () => <hr className="border-secondary my-8" />,
};

export default MDXComponents;
