<<<<<<< HEAD
'use client';

import { useEffect, useState } from 'react';
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCcw, Shield, FileText, Lock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Simple type for our signals from the API
interface Signal {
  id: string;
  timestamp: string;
  companyName: string;
  contactEmail: string;
  leadType: string;
  orderSize: number;
  artifact?: string | null;
  nodeReference?: string;
  interestType: {
    stripe: boolean;
    invoice: boolean;
    signalAccess: boolean;
    mirror: boolean;
  };
  securePassphrase?: string;
  stripePaymentIntentId?: string;
  stripeConfirmed?: boolean;
  llmCategory?: string;
  llmConfidence?: number;
  llmRationale?: string;
}

export default function AdminPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);

  const fetchSignals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/signals');
      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.signals)) {
        setSignals(data.signals);
        setFilteredSignals(data.signals);
      } else {
        console.error('Invalid data format returned from API:', data);
        setSignals([]);
        setFilteredSignals([]);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
      setSignals([]);
      setFilteredSignals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuthentication = () => {
      if (typeof window !== 'undefined') {
        const isAuth = localStorage.getItem('adminAuthenticated') === 'true';
        setIsAuthenticated(isAuth);

        // If authenticated, fetch signals
        if (isAuth) {
          fetchSignals();
        }
      }
    };

    checkAuthentication();
  }, []);

  // Apply search filter
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSignals(signals);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = signals.filter(signal =>
        signal.companyName?.toLowerCase().includes(term) ||
        signal.contactEmail?.toLowerCase().includes(term) ||
        signal.nodeReference?.toLowerCase().includes(term) ||
        signal.leadType?.toLowerCase().includes(term)
      );
      setFilteredSignals(filtered);
    }
  }, [searchTerm, signals]);

  const handleLogin = () => {
    // For demo purposes, accept any non-empty password
    if (adminPassword.trim()) {
      setIsAuthenticated(true);
      setAuthError("");

      // Save authentication state to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAuthenticated', 'true');
      }

      // Load signals after authentication
      fetchSignals();
    } else {
      setAuthError("Please enter a password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPassword("");

    // Clear authentication state from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminAuthenticated');
    }
  };

  // Generate status tags based on signal data
  const getStatusTags = (signal: Signal) => {
    const tags = [];

    if (signal.leadType === 'Buyer') {
      tags.push(<Badge key="high-signal" variant="destructive">HIGH-SIGNAL</Badge>);
    }

    if (signal.interestType?.mirror) {
      tags.push(<Badge key="mirror" variant="outline">NEEDS-MIRROR</Badge>);
    }

    if (signal.artifact) {
      tags.push(<Badge key="artifact" variant="secondary">ARTEFACT-LOADED</Badge>);
    }

    if (signal.stripeConfirmed) {
      tags.push(<Badge key="stripe" className="bg-green-500 hover:bg-green-600">STRIPE-CONFIRMED</Badge>);
    } else if (signal.interestType?.stripe) {
      tags.push(<Badge key="stripe" className="bg-green-500/50 hover:bg-green-600/50">STRIPE</Badge>);
    }

    if (signal.llmCategory) {
      const getBadgeStyle = (category: string) => {
        switch(category) {
          case 'Suspicious':
            return "bg-red-500 hover:bg-red-600";
          case 'Confirmed':
            return "bg-blue-500 hover:bg-blue-600";
          case 'Needs-Mirror':
            return "bg-purple-500 hover:bg-purple-600";
          default:
            return "bg-gray-500 hover:bg-gray-600";
        }
      };

      tags.push(
        <Badge key="gpt" className={getBadgeStyle(signal.llmCategory)}>
          {signal.llmCategory}
        </Badge>
      );
    }

    if (signal.securePassphrase) {
      tags.push(
        <Badge key="secure" className="bg-blue-500 hover:bg-blue-600">
          <Shield className="h-3 w-3 mr-1" /> SECURED
        </Badge>
      );
    }

    if (tags.length === 0) {
      tags.push(<Badge key="standard" variant="secondary">STANDARD</Badge>);
    }

    return tags;
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Admin Authentication</CardTitle>
              <CardDescription>
                Enter your admin password to access the control panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                  {authError && (
                    <p className="text-sm text-red-500">{authError}</p>
                  )}
                </div>
              </div>
            </CardContent>
            <DialogFooter className="px-6 pb-6">
              <Button onClick={handleLogin} className="w-full">
                Login
              </Button>
            </DialogFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage and monitor signal processing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
            <Button
              variant="default"
              onClick={fetchSignals}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Signals</CardTitle>
              <CardDescription>
                {filteredSignals.length} signals found
                {searchTerm && ` matching "${searchTerm}"`}
              </CardDescription>
              <div className="mt-2">
                <Input
                  placeholder="Search by company, email, node reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading signals...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Lead Type</TableHead>
                      <TableHead>Node Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSignals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2" />
                            <p>No signals found</p>
                            <p className="text-sm">Try changing your search term or submit a new signal</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSignals.map((signal) => (
                        <TableRow key={signal.id}>
                          <TableCell>{formatDateTime(signal.timestamp)}</TableCell>
                          <TableCell>
                            {signal.companyName}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {signal.contactEmail}
                            </span>
                          </TableCell>
                          <TableCell>{signal.leadType}</TableCell>
                          <TableCell>{signal.nodeReference || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusTags(signal)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSignal(signal)}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Signal Detail Dialog */}
      <Dialog open={!!selectedSignal} onOpenChange={(open) => !open && setSelectedSignal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Signal Details</DialogTitle>
            <DialogDescription>
              View detailed information about this signal
            </DialogDescription>
          </DialogHeader>

          {selectedSignal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedSignal.companyName}</h3>
                  <p className="text-sm text-muted-foreground">{formatDateTime(selectedSignal.timestamp)}</p>
                </div>
                <div className="flex gap-1">
                  {getStatusTags(selectedSignal)}
                </div>
              </div>

              <div className="p-4 border rounded-md mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Company</p>
                    <p className="text-sm">{selectedSignal.companyName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-sm">{selectedSignal.contactEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Lead Type</p>
                    <p className="text-sm">{selectedSignal.leadType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Order Size</p>
                    <p className="text-sm">${selectedSignal.orderSize || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Artifact</p>
                    <p className="text-sm">{selectedSignal.artifact || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Node Reference</p>
                    <p className="text-sm">{selectedSignal.nodeReference || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Signal ID</p>
                    <p className="text-sm font-mono">{selectedSignal.id}</p>
                  </div>
                  {selectedSignal.stripePaymentIntentId && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Stripe Payment</p>
                      <p className="text-sm font-mono">{selectedSignal.stripePaymentIntentId}</p>
                    </div>
                  )}
                  {selectedSignal.llmCategory && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-sm font-medium">LLM Classification</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={
                          selectedSignal.llmCategory === 'Suspicious' ? "bg-red-500" :
                          selectedSignal.llmCategory === 'Confirmed' ? "bg-blue-500" :
                          selectedSignal.llmCategory === 'Needs-Mirror' ? "bg-purple-500" :
                          "bg-gray-500"
                        }>
                          {selectedSignal.llmCategory}
                        </Badge>
                        {selectedSignal.llmConfidence && (
                          <span className="text-xs text-muted-foreground">
                            Confidence: {(selectedSignal.llmConfidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      {selectedSignal.llmRationale && (
                        <p className="text-sm mt-1 text-muted-foreground">
                          "{selectedSignal.llmRationale}"
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Security</p>
                    <p className="text-sm">
                      {selectedSignal.securePassphrase ? (
                        <span className="flex items-center">
                          <Lock className="h-3 w-3 mr-1" /> Passphrase Protected
                        </span>
                      ) : (
                        'Standard'
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">Interest Types</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selectedSignal.interestType?.stripe && (
                      <Badge>Stripe</Badge>
                    )}
                    {selectedSignal.interestType?.invoice && (
                      <Badge variant="outline">Invoice</Badge>
                    )}
                    {selectedSignal.interestType?.signalAccess && (
                      <Badge variant="secondary">Signal Access</Badge>
                    )}
                    {selectedSignal.interestType?.mirror && (
                      <Badge variant="secondary">Mirror</Badge>
                    )}
                    {!selectedSignal.interestType?.stripe &&
                      !selectedSignal.interestType?.invoice &&
                      !selectedSignal.interestType?.signalAccess &&
                      !selectedSignal.interestType?.mirror && (
                        <span className="text-sm text-muted-foreground">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedSignal(null)}>
                  Close
                </Button>
                <Button>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Process Again
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
=======
// New admin page for mounting ChatPanel and signals

import ChatPanel from '@/components/ChatPanel';
import { Suspense } from 'react';
import { readSignalsBlob } from '@/lib/services/blob-service';

async function SignalsPanel() {
  const signals = await readSignalsBlob();
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-xl mb-2 text-zinc-700 dark:text-zinc-300">Signals</h2>
      {signals.length === 0 && <div className="text-sm text-zinc-400">No signals yet.</div>}
      {signals.slice().reverse().map((signal: any, idx: number) => (
        <div key={idx} className="rounded bg-zinc-100 dark:bg-zinc-800 p-2 shadow text-xs">
          <pre className="whitespace-pre-line">{JSON.stringify(signal, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-screen">
      <div className="flex-1 bg-muted text-muted-foreground p-4 dark:bg-zinc-900 dark:text-zinc-100">
        <Suspense fallback={<div>Loading chat…</div>}>
          <ChatPanel />
        </Suspense>
      </div>
      <div className="w-full md:w-[400px] border-l bg-background p-4 max-h-screen overflow-y-auto">
        <Suspense fallback={<div>Loading signals…</div>}>
          <SignalsPanel />
        </Suspense>
      </div>
    </div>
>>>>>>> 09fbac6 (Phase 1: Rebuild /api, Blob, Admin ChatPanel, artefact bridge logic (no artefact or legacy blob overwrite))
  );
}
