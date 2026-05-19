import { GetServerSideProps } from 'next';

// Root "/" redirects to /discover
export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/discover', permanent: false } };
};
