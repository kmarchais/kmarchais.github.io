/**
 * Page loading component for React.lazy() Suspense fallback.
 * Shows a minimal loading indicator while route chunks are being loaded.
 */

const PageLoader = () => {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-secondary border-t-tertiary rounded-full animate-spin" />
        <p className="text-secondary text-sm">Loading...</p>
      </div>
    </div>
  );
};

export default PageLoader;
