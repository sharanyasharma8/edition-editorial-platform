import Link from "next/link";
export default function NotFound() { return <main className="error-state"><span className="eyebrow">404 / OUT OF FRAME</span><h1>This page is<br /><em>elsewhere.</em></h1><p>The story you’re looking for may have moved or is still being edited.</p><Link className="button-dark" href="/edit">RETURN TO THE EDIT</Link></main>; }
