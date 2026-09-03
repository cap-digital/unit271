/** @type {import('next').NextConfig} */
const nextConfig = {
  // ogl é publicado em ESM sem build; o Next precisa transpilá-lo.
  transpilePackages: ["ogl"],
};

export default nextConfig;
