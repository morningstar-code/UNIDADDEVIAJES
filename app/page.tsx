import { redirect } from 'next/navigation'

export default function Home() {
  // Always redirect to login - client-side will handle dashboard redirect if logged in
  redirect('/login')
}
