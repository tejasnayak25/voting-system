/* Fixed version of page.tsx with improvements */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Vote, Shield, Users, BarChart3, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface User {
  email: string;
  role: 'admin' | 'user';
  hasVoted: boolean;
}

interface Candidate {
  id: string;
  name: string;
  position: string;
  description: string;
  votes: number;
}

interface VoteSelection {
  [position: string]: string;
}

export default function VotingSystem() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingVotedStatus, setCheckingVotedStatus] = useState(true); // new state
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [voteSelections, setVoteSelections] = useState<VoteSelection>({});
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [resettingVotes, setResettingVotes] = useState(false);
  const [togglingVoting, setTogglingVoting] = useState(false);
  const { toast } = useToast();

  const fetchCandidates = async () => {
    const res = await fetch('/api/candidates');
    const data = await res.json();
    setCandidates(data.candidates || []);
  };

  useEffect(() => {
    const adminUser = localStorage.getItem('votingSystemUser');
    if (adminUser) {
      const user = JSON.parse(adminUser);
      // Check voted status from backend if not admin
      if (user.role !== 'admin') {
        fetch(`/api/voted?email=${encodeURIComponent(user.email)}`)
          .then(res => res.json())
          .then(data => {setCurrentUser({ ...user, hasVoted: !!data.voted });})
          .catch(() => setCurrentUser(user))
          .finally(() => setCheckingVotedStatus(false)); // done checking
      } else {
        // if admin, directly set the user and skip the voted check
        fetch(`/api/voting-enabled`)
          .then(res => res.json())
          .then(data => setVotingEnabled(data.enabled))
          .catch(() => setVotingEnabled(false))
          .finally(() => {
            setCheckingVotedStatus(false);
            setCurrentUser(user);
          });
      }
    }

    fetchCandidates();

    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("/api/csrf");
        let data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
      }
    };

    fetchCsrfToken();
  }, []);

  const validateEmail = (email: string) => email.endsWith('@sode-edu.in');

  const sendOTP = async () => {
    if (!validateEmail(email)) {
      toast({ title: 'Invalid Email', description: 'Only @sode-edu.in emails allowed.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setOtpSent(true);
        toast({ title: 'OTP Sent', description: `OTP sent to ${email}. Please check your inbox.` });
      } else {
        toast({ title: 'Error', description: 'Failed to send OTP email.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send OTP email.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast({ title: 'Invalid OTP format', description: 'OTP must be a 6-digit number.', variant: 'destructive' });
      return;
    }
    setVerifyingOTP(true);
    let res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });

    if(res.ok) {
      const data = await res.json();
      const user: User = { email, role: data.role, hasVoted: data.hasVoted || false };
      setCheckingVotedStatus(false);
      setCurrentUser(user);
      localStorage.setItem('votingSystemUser', JSON.stringify(user));
      toast({ title: 'Login Successful', description: `Welcome ${data.role}!` });
    } else {
      toast({ title: 'Invalid OTP', description: 'Incorrect OTP.', variant: 'destructive' });
    }

    setVerifyingOTP(false);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('votingSystemUser');
    setEmail('');
    setOtp('');
    setOtpSent(false);
  };

  const submitVotes = async () => {
    if (currentUser?.role === 'admin') {
      toast({ title: 'Admins cannot vote', description: '', variant: 'destructive' });
      return;
    }
    if (currentUser?.hasVoted) {
      toast({ title: 'Already Voted', description: '', variant: 'destructive' });
      return;
    }
    const positions = [...Array.from(new Set(candidates.map(c => c.position)))];
    const selectedPositions = Object.keys(voteSelections);
    if (selectedPositions.length !== positions.length) {
      toast({ title: 'Incomplete Selection', description: 'Select a candidate for each position.', variant: 'destructive' });
      return;
    }

    setSubmittingVotes(true);

    // Call backend voting route
    const candidateIds = Object.values(voteSelections);
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken!,
      },
      body: JSON.stringify({ candidateIds, email: currentUser?.email })
    });

    if (res.ok) {
      toast({ title: 'Votes Cast', description: 'All your votes have been recorded.' });
      setVoteSelections({});
      fetchCandidates();
      setCurrentUser({ ...currentUser!, hasVoted: true });
      localStorage.setItem('votingSystemUser', JSON.stringify({ ...currentUser!, hasVoted: true }));
    } else {
      if(res.status === 403) {
        const data = await res.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to cast votes.', variant: 'destructive' });
      }
    }

    setSubmittingVotes(false);
  };

  const handleCandidateSelection = (position: string, candidateId: string) => {
    setVoteSelections(prev => ({ ...prev, [position]: candidateId }));
  };

  async function addCandidate (name: string, position: string, description: string) : Promise<void> {
    const exists = candidates.some(c => c.name === name && c.position === position);
    if (exists) {
      toast({ title: 'Duplicate Candidate', description: 'Same name & position already exists.', variant: 'destructive' });
      return;
    }
    let data = JSON.stringify({ name, position, description, email: currentUser?.email });

    candidates.push({ id: crypto.randomUUID(), name, position, description, votes: 0 });
    setCandidates([...candidates]);

    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data
    });
    if (res.ok) {
      toast({ title: 'Candidate Added', description: `${name} has been added.` });
      fetchCandidates();
    } else {
      toast({ title: 'Error', description: 'Failed to add candidate.', variant: 'destructive' });
    }
  };

  const deleteCandidate = async (id: string) => {
    candidates.splice(candidates.findIndex(c => c.id === id), 1);
    setCandidates([...candidates]);
    const res = await fetch('/api/candidates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email: currentUser?.email })
    });
    if (res.ok) {
      toast({ title: 'Candidate Removed', description: 'Candidate removed successfully.' });
      fetchCandidates();
    } else {
      toast({ title: 'Error', description: 'Failed to remove candidate.', variant: 'destructive' });
    }
  };

  async function toggleVoting() {
    setTogglingVoting(true);
    const res = await fetch('/api/voting-enabled', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken!,
      },
      body: JSON.stringify({ email: currentUser?.email })
    });

    if(res.ok) {
      toast({ title: 'Voting Toggled', description: 'Voting has been toggled.' });
      setVotingEnabled(!votingEnabled);
    } else {
      if(res.status === 403) {
        toast({ title: 'Error', description: 'You are not authorized to do this operation.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: 'Failed to toggle voting.', variant: 'destructive' });
      }
    }

    setTogglingVoting(false);
  }

  async function resetVotes() {
    setResetConfirmationOpen(false);
    setResettingVotes(true);
    const res = await fetch('/api/reset-votes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken!,
      },
      body: JSON.stringify({ email: currentUser?.email })
    });

    if(res.ok) {
      toast({ title: 'Votes Reset', description: 'All votes have been reset.' });
      fetchCandidates();
    } else {
      if(res.status === 403) {
        toast({ title: 'Error', description: 'You are not authorized to reset votes.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: 'Failed to reset votes.', variant: 'destructive' });
      }
    }

    setResettingVotes(false);
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
              <Vote className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SODE Voting System</h1>
            <p className="text-gray-600">Secure authentication for educational voting</p>
          </div>
          <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Login to Vote</CardTitle>
              <CardDescription>Enter your @sode-edu.in email address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@sode-edu.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={otpSent}
                />
              </div>
              {!otpSent ? (
                <Button 
                  onClick={sendOTP} 
                  disabled={loading || !email}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={verifyOTP} 
                    disabled={otp.length !== 6 || verifyingOTP}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    { verifyingOTP ? 'Verifying OTP...' : "Verify & Login" }
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="w-full"
                  >
                    Change Email
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </div>
    );
  }

  if (checkingVotedStatus) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">Loading...</div>; // Or a more styled loading indicator
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0 gap-4">
            <div className="flex flex-row justify-between items-center sm:space-x-4 w-full">
              <div className="flex items-center gap-3">
                <Vote className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">SODE Voting System</h1>
              </div>
              <Button variant="outline" onClick={logout} className="w-auto aspect-square block sm:hidden">
                <LogOut/>
              </Button>
            </div>
            <div className="flex flex-row items-center gap-5">
              <Button variant="outline" onClick={logout} className="w-full sm:w-auto hidden sm:block">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8 py-12 sm:py-24">
        {currentUser.role === 'admin' ? (
          <AdminDashboard 
            candidates={candidates}
            addCandidate={addCandidate}
            deleteCandidate={deleteCandidate}
            votingEnabled={votingEnabled}
          />
        ) : (
          <UserDashboard 
            candidates={candidates}
            voteSelections={voteSelections}
            onCandidateSelect={handleCandidateSelection}
            onSubmitVotes={submitVotes}
            submittingVotes={submittingVotes}
            hasVoted={currentUser.hasVoted}
          />
        )}
      </main>
      {currentUser.role === 'admin' ? (
        <div className='flex justify-center sm:justify-between items-center mt-8 p-4 sm:p-5 bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0 z-50'>
          <p className='hidden sm:block'>
            <p className='text-gray-600'>Admin: {currentUser?.email}</p>
          </p>
          <div className='flex w-full sm:w-auto justify-between sm:justify-center items-center gap-4'>
            <Button variant="default" disabled={togglingVoting} onClick={() => toggleVoting()} className="w-auto">
              {togglingVoting ? 'Updating...' : (votingEnabled ? "Disable Voting" : "Enable Voting")}
            </Button>
            <Button variant="secondary" disabled={resettingVotes} onClick={() => setResetConfirmationOpen(true)} className="w-auto bg-red-500 hover:bg-red-600 text-white">
              {resettingVotes ? "Resetting Votes..." : "Reset Votes"}
            </Button>
            <Dialog open={resetConfirmationOpen} onOpenChange={(o) => !o && setResetConfirmationOpen(false)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Votes</DialogTitle>
                  <DialogDescription>Are you sure you want to reset all votes? This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" onClick={() => setResetConfirmationOpen(false)}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button className='bg-red-500 hover:bg-red-600 text-white' onClick={() => resetVotes()}>Reset Votes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (<></>)}
      <Toaster />
    </div>
  );
}

function AdminDashboard({ candidates, addCandidate, deleteCandidate, votingEnabled }: { candidates: Candidate[]; addCandidate: (name: string, position: string, description: string) => Promise<void>; deleteCandidate: (id: string) => void; votingEnabled: boolean; }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    if (name && position && description) {
      setAddingCandidate(true);
      addCandidate(name, position, description).then(() => {
        setAddingCandidate(false);
      });
      setName('');
      setPosition('');
      setDescription('');
      setShowAddForm(false);
    }
  };

  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

  const groupedAndSorted = candidates.reduce((acc:any, candidate:any) => {
    if (!acc[candidate.position]) acc[candidate.position] = [];
    acc[candidate.position].push(candidate);
    return acc;
  }, {});

  Object.keys(groupedAndSorted).forEach(position => {
    groupedAndSorted[position].sort((a:any, b:any) => b.votes - a.votes);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-2 mb-4">Manage candidates and view voting results</p>
        </div>
        <Button disabled={votingEnabled} onClick={() => {
          setShowAddForm(!showAddForm);
          setTimeout(() => {
            addRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }, 0);
        }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-auto">Add Candidate</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><Users className="w-5 h-5 text-blue-600" /><div><p className="text-sm font-medium text-gray-600">Total Candidates</p><p className="text-2xl font-bold text-gray-900">{candidates.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><Vote className="w-5 h-5 text-green-600" /><div><p className="text-sm font-medium text-gray-600">Total Votes</p><p className="text-2xl font-bold text-gray-900">{totalVotes}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><BarChart3 className="w-5 h-5 text-purple-600" /><div><p className="text-sm font-medium text-gray-600">Avg Votes</p><p className="text-2xl font-bold text-gray-900">{candidates.length > 0 ? Math.round(totalVotes / candidates.length) : 0}</p></div></div></CardContent></Card>
      </div>
      {showAddForm && (
        <Card ref={addRef} className="mb-6">
          <CardHeader><CardTitle>Add New Candidate</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Name</Label>
                <Input id="candidateName" value={name} onChange={e => setName(e.target.value)} placeholder="Enter candidate name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidatePosition">Position</Label>
                <Input id="candidatePosition" value={position} onChange={e => setPosition(e.target.value)} placeholder="Enter position" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="candidateDescription">Description</Label>
              <Input id="candidateDescription" value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter candidate description" />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAdd} disabled={!name || !position || !description || addingCandidate}>{addingCandidate ? 'Adding Candidate...' : "Add Candidate"}</Button>
              <Button variant="outline" className={addingCandidate ? 'hidden' : 'block'} onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {Object.entries(groupedAndSorted).map(([position, candidatesInPosition]:[any, any]) => (
        <div key={position}>
          <h2 className="text-2xl font-bold mb-4">{position}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {candidatesInPosition.map((candidate:any) => (
              <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{candidate.name}</CardTitle>
                      <CardDescription>{candidate.position}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-lg font-semibold">{candidate.votes} votes</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{candidate.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width:
                            totalVotes > 0
                              ? `${(candidate.votes / (candidatesInPosition.reduce((sum:any, c:any) => sum + c.votes, 0))) * 100}%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCandidate(candidate.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserDashboard({ candidates, voteSelections, onCandidateSelect, onSubmitVotes, submittingVotes, hasVoted }: { candidates: Candidate[]; voteSelections: VoteSelection; onCandidateSelect: (position: string, candidateId: string) => void; onSubmitVotes: () => void; submittingVotes: boolean; hasVoted: boolean; }) {
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const positions = [...Array.from(new Set(candidates.map(c => c.position)))];
  const groupedCandidates = positions.reduce((acc, position) => {
    acc[position] = candidates.filter(c => c.position === position);
    return acc;
  }, {} as Record<string, Candidate[]>);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Cast Your Vote</h2>
        <p className="text-gray-600">
          {hasVoted ? 'Thank you for voting! View the current results below.' : 'Select your preferred candidate for each position.'}
        </p>
        {hasVoted && (
          <Badge variant="secondary" className="mt-2">
            <Vote className="w-4 h-4 mr-1" />
            Votes Cast
          </Badge>
        )}
      </div>
      {!hasVoted && (
        <div className="space-y-8">
          {positions.map(position => (
            <Card key={position} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-2xl text-gray-900">{position}</CardTitle>
                <CardDescription className="text-gray-600">Select one candidate for this position</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedCandidates[position].map(candidate => (
                    <div
                      key={candidate.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md ${voteSelections[position] === candidate.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => onCandidateSelect(position, candidate.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg text-gray-900">{candidate.name}</h3>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${voteSelections[position] === candidate.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                          {voteSelections[position] === candidate.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{candidate.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-center">
            <Button 
              onClick={onSubmitVotes}
              disabled={Object.keys(voteSelections).length !== positions.length || submittingVotes}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-3 text-lg"
              size="lg"
            >
              { submittingVotes ? 'Submitting Votes...' : `Submit All Votes (${Object.keys(voteSelections).length}/${positions.length})`}
            </Button>
          </div>
        </div>
      )}
      {hasVoted && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Voting Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {positions.map(position => (
                <div key={position}>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{position}</h3>
                  <div className="space-y-4">
                    {groupedCandidates[position]
                      .sort((a, b) => b.votes - a.votes)
                      .map((candidate, index) => (
                        <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant={index === 0 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                            <div>
                              <p className="font-semibold">{candidate.name}</p>
                              <p className="text-sm text-gray-600">{candidate.position}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{candidate.votes}</p>
                            <p className="text-sm text-gray-600">{totalVotes > 0 ? Math.round((candidate.votes / (groupedCandidates[position].reduce((sum, c) => sum + c.votes, 0))) * 100) : 0}%</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
