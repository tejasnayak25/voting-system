/* Fixed version of page.tsx with improvements */
'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [voteSelections, setVoteSelections] = useState<VoteSelection>({});
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
          .then(data => {
            setCurrentUser({ ...user, hasVoted: !!data.voted });
          })
          .catch(() => setCurrentUser(user));
      } else {
        setCurrentUser(user);
      }
    }

    fetchCandidates();
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
    let res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });

    if(res.ok) {
      const role = email === 'admin@sode-edu.in' ? 'admin' : 'user';
      const user: User = { email, role, hasVoted: false };
      setCurrentUser(user);
      localStorage.setItem('votingSystemUser', JSON.stringify(user));
      toast({ title: 'Login Successful', description: `Welcome ${role}!` });
    } else {
      toast({ title: 'Invalid OTP', description: 'Incorrect OTP.', variant: 'destructive' });
    }
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

    // Call backend voting route
    const candidateIds = Object.values(voteSelections);
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds, email: currentUser?.email })
    });

    if (res.ok) {
      toast({ title: 'Votes Cast', description: 'All your votes have been recorded.' });
      setVoteSelections({});
      fetchCandidates();
      setCurrentUser({ ...currentUser!, hasVoted: true });
      localStorage.setItem('votingSystemUser', JSON.stringify({ ...currentUser!, hasVoted: true }));
    } else {
      toast({ title: 'Error', description: 'Failed to cast votes.', variant: 'destructive' });
    }
  };

  const handleCandidateSelection = (position: string, candidateId: string) => {
    setVoteSelections(prev => ({ ...prev, [position]: candidateId }));
  };

  const addCandidate = async (name: string, position: string, description: string) => {
    const exists = candidates.some(c => c.name === name && c.position === position);
    if (exists) {
      toast({ title: 'Duplicate Candidate', description: 'Same name & position already exists.', variant: 'destructive' });
      return;
    }
    let data = JSON.stringify({ name, position, description });
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
    const res = await fetch('/api/candidates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      toast({ title: 'Candidate Removed', description: 'Candidate removed successfully.' });
      fetchCandidates();
    } else {
      toast({ title: 'Error', description: 'Failed to remove candidate.', variant: 'destructive' });
    }
  };

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
                    disabled={otp.length !== 6}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Verify & Login
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8 py-12 sm:py-20">
        {currentUser.role === 'admin' ? (
          <AdminDashboard 
            candidates={candidates}
            addCandidate={addCandidate}
            deleteCandidate={deleteCandidate}
          />
        ) : (
          <UserDashboard 
            candidates={candidates}
            voteSelections={voteSelections}
            onCandidateSelect={handleCandidateSelection}
            onSubmitVotes={submitVotes}
            hasVoted={currentUser.hasVoted}
          />
        )}
      </main>
      <Toaster />
    </div>
  );
}

function AdminDashboard({ candidates, addCandidate, deleteCandidate }: { candidates: Candidate[]; addCandidate: (name: string, position: string, description: string) => void; deleteCandidate: (id: string) => void; }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const addRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    if (name && position && description) {
      addCandidate(name, position, description);
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
        <Button onClick={() => {
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
              <Button onClick={handleAdd} disabled={!name || !position || !description}>Add Candidate</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
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

function UserDashboard({ candidates, voteSelections, onCandidateSelect, onSubmitVotes, hasVoted }: { candidates: Candidate[]; voteSelections: VoteSelection; onCandidateSelect: (position: string, candidateId: string) => void; onSubmitVotes: () => void; hasVoted: boolean; }) {
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
              disabled={Object.keys(voteSelections).length !== positions.length}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8 py-3 text-lg"
              size="lg"
            >
              Submit All Votes ({Object.keys(voteSelections).length}/{positions.length})
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
