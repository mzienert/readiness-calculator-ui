import { Chat } from '@/components/chat';
import { v4 as uuidv4 } from 'uuid';
// Simple inline data stream handler component
function DataStreamHandler() {
  return null;
}
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const id = uuidv4();

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
