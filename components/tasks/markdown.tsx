import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

// Pas de rehype-raw : le HTML brut n'est jamais interprété.
const components: Components = {
  h1: (props) => <h3 className="mt-4 mb-2 font-heading text-lg font-semibold first:mt-0" {...props} />,
  h2: (props) => <h4 className="mt-4 mb-2 font-heading text-base font-semibold first:mt-0" {...props} />,
  h3: (props) => <h5 className="mt-3 mb-1 font-semibold first:mt-0" {...props} />,
  p: (props) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  a: (props) => <a className="underline underline-offset-4 hover:text-foreground" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: (props) => <blockquote className="my-2 border-l-2 border-white/15 pl-3 text-muted-foreground" {...props} />,
  code: (props) => <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[0.85em]" {...props} />,
  pre: (props) => <pre className="my-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 [&_code]:bg-transparent [&_code]:p-0" {...props} />,
  table: (props) => <table className="my-2 w-full text-left text-sm [&_td]:border-t [&_td]:border-white/10 [&_td]:py-1.5 [&_th]:py-1.5" {...props} />,
  hr: () => <hr className="my-4 border-white/10" />,
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm text-zinc-300">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
