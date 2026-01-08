const MDXComponents = {
  h1: (props) => <h1 className="text-white font-bold text-3xl mt-8 mb-4" {...props} />,
  h2: (props) => <h2 className="text-white font-bold text-2xl mt-8 mb-3" {...props} />,
  h3: (props) => <h3 className="text-white font-bold text-xl mt-6 mb-2" {...props} />,
  h4: (props) => <h4 className="text-white font-bold text-lg mt-4 mb-2" {...props} />,
  p: (props) => <p className="text-tertiary text-base leading-relaxed mb-4" {...props} />,

  pre: (props) => (
    <pre className="bg-black-100 rounded-lg p-4 overflow-x-auto mb-4 text-sm" {...props} />
  ),
  code: ({ className, children, ...props }) => {
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

  ul: (props) => <ul className="text-tertiary list-disc ml-6 mb-4 space-y-1" {...props} />,
  ol: (props) => <ol className="text-tertiary list-decimal ml-6 mb-4 space-y-1" {...props} />,
  li: (props) => <li className="text-tertiary" {...props} />,

  a: (props) => (
    <a className="text-secondary hover:text-white underline transition-colors" {...props} />
  ),

  img: (props) => (
    <img className="rounded-lg my-6 max-w-full mx-auto" {...props} />
  ),

  blockquote: (props) => (
    <blockquote className="border-l-4 border-secondary pl-4 italic text-tertiary my-4" {...props} />
  ),

  table: (props) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full text-tertiary border-collapse" {...props} />
    </div>
  ),
  thead: (props) => <thead className="border-b border-secondary" {...props} />,
  th: (props) => <th className="px-4 py-2 text-left text-white font-semibold" {...props} />,
  td: (props) => <td className="border-b border-black-100 px-4 py-2" {...props} />,

  hr: () => <hr className="border-secondary my-8" />,
};

export default MDXComponents;
