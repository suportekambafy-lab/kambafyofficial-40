import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const DynamicSEO: React.FC<SEOProps> = ({
  title = "Kambafy - Plataforma de Infoprodutos",
  description = "Crie, venda e gerencie seus produtos digitais com checkout otimizado",
  image = "https://kambafy.com/lovable-uploads/d8006597-4c28-4313-b50d-96a944e49040.png",
  url = "https://kambafy.com",
  type = "website"
}) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Performance hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://api.kambafy.com" />
      <link rel="dns-prefetch" href="https://supabase.co" />
    </Helmet>
  );
};