import Page from '../components/Page';
import { TLink } from '../transition';

export default function NotFound() {
  return (
    <Page>
      <section className="section narrow center">
        <p className="eyebrow">Error 404</p>
        <h1 className="h1">This road does not lead anywhere.</h1>
        <p className="lead">The page you are looking for does not exist.</p>
        <TLink to="/" className="btn-glass">BACK HOME <span className="arrow">↗</span></TLink>
      </section>
    </Page>
  );
}
