"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formSchema } from "@/lib/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

type FormValues = z.infer<typeof formSchema>;

export function SignalForm() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPassphraseRequired, setIsPassphraseRequired] = useState(false);
  const [inputPassphrase, setInputPassphrase] = useState("");
  const [processingResult, setProcessingResult] = useState<{
    success: boolean;
    message: string;
    eventId?: string;
    error?: string;
  } | null>(null);

  // Define form with typed schema
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactEmail: "",
      leadType: "Unknown",
      orderSize: 0,
      interestType: {
        stripe: false,
        invoice: false,
        signalAccess: false,
        mirror: false,
      },
      securePassphrase: "",
      nodeReference: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      // Check if secure passphrase is provided
      if (values.securePassphrase && values.securePassphrase.trim() !== '') {
        setIsPassphraseRequired(true);
        setProcessingResult(null);
        setIsSubmitting(false);
        return;
      }

      await processForm(values);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error sending signal",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const processForm = async (values: FormValues, passphrase?: string) => {
    try {
      // Prepare data object for API
      const formData = {
        companyName: values.companyName,
        contactEmail: values.contactEmail,
        leadType: values.leadType,
        orderSize: values.orderSize,
        interestType: values.interestType,
        nodeReference: values.nodeReference || "",
        securePassphrase: values.securePassphrase,
        inputPassphrase: passphrase,
        artifact: file ? file.name : null,
      };

      let result;

      try {
        // Call the real API
        const response = await fetch("/api/signal", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        result = await response.json();
      } catch (error) {
        console.error("API call failed:", error);
        // Fallback error response
        result = {
          status: 'error',
          message: "Failed to process signal. Please try again later."
        };
      }

      // Store the processing result
      setProcessingResult({
        success: result.status === 'success',
        message: result.status === 'success' ? 'Signal sent successfully' : result.message,
        eventId: result.event?.id,
        error: result.status === 'error' ? result.message : undefined,
      });

      // Show appropriate toast message
      if (result.status === 'success') {
        toast({
          title: "Signal sent successfully",
          description: "Your signal has been processed and dispatched.",
        });

        // Reset form on success
        form.reset();
        setFile(null);
      } else {
        toast({
          title: "Error sending signal",
          description: result.message || "There was an error processing your request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing form:", error);
      setProcessingResult({
        success: false,
        message: "Error processing signal",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
      toast({
        title: "Error sending signal",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsPassphraseRequired(false);
    }
  };

  const handlePassphraseSubmit = () => {
    const values = form.getValues();
    processForm(values, inputPassphrase);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Build Co LLM Controller</CardTitle>
          <CardDescription>Signal Execution Shell</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="leadType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lead type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Buyer">Buyer</SelectItem>
                          <SelectItem value="Signal Observer">
                            Signal Observer
                          </SelectItem>
                          <SelectItem value="LLM Monitor">LLM Monitor</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orderSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Size ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem className="flex flex-col">
                <FormLabel>Upload Artefact</FormLabel>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="artifact-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/50"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or
                        drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, YAML, or document (max. 10MB)
                      </p>
                    </div>
                    <Input
                      id="artifact-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.yaml,.yml,.doc,.docx,.txt"
                    />
                  </label>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected file: {file.name}
                  </p>
                )}
              </FormItem>

              <FormField
                control={form.control}
                name="nodeReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Node Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter node reference" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional metadata field for signal mapping
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Interest Type</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="interestType.stripe"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Stripe
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestType.invoice"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Invoice
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestType.signalAccess"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Signal Access
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interestType.mirror"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Mirror
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="securePassphrase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secure Passphrase (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter secure passphrase"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Used to gate sensitive signals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Submit Signal"}
              </Button>

              {processingResult && processingResult.success && (
                <div className="mt-4 p-4 border rounded bg-green-50 dark:bg-green-900/20">
                  <h3 className="font-medium">Signal Sent Successfully</h3>
                  <p className="text-sm mt-1">Event ID: {processingResult.eventId}</p>
                  {processingResult.message && (
                    <p className="text-sm mt-1">{processingResult.message}</p>
                  )}
                </div>
              )}

              {processingResult && !processingResult.success && (
                <div className="mt-4 p-4 border rounded bg-red-50 dark:bg-red-900/20">
                  <h3 className="font-medium text-red-800 dark:text-red-300">Error Processing Signal</h3>
                  {processingResult.error && (
                    <p className="text-sm mt-1 text-red-700 dark:text-red-400">{processingResult.error}</p>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isPassphraseRequired} onOpenChange={setIsPassphraseRequired}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure Signal Verification</DialogTitle>
            <DialogDescription>
              This signal requires a passphrase. Please provide the passphrase to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter passphrase"
              value={inputPassphrase}
              onChange={(e) => setInputPassphrase(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPassphraseRequired(false)}>
              Cancel
            </Button>
            <Button onClick={handlePassphraseSubmit} disabled={!inputPassphrase}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
