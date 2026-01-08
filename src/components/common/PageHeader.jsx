import './PageHeader.css';

export default function PageHeader({ title, subtitle, image, imageAlt }) {
  return (
    <div className={`page-header-banner ${image ? 'with-image' : ''}`}>
      <div className="decoration-pattern"></div>
      <div className="page-header-banner-content">
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {image && (
        <div className="page-header-banner-image">
          <img src={image} alt={imageAlt || title} />
        </div>
      )}
    </div>
  );
}

