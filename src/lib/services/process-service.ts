import { FormData, EventLog, EventFlags, SecurityStatus, ServiceResponse } from '../types';
import * as stripeService from './stripe-service';
import * as githubService from './github-service';
import * as openaiService from './openai-service';
import * as storageService from './storage-service';
import * as securityService from './security-service';

// Process a signal form submission
export async function processSignal(
  formData: FormData,
  artifactFile?: File | null,
  inputPassphrase?: string
): Promise<{
  success: boolean;
  message: string;
  eventId?: string;
  error?: string;
}> {
  try {
    // 1. Check security (if passphrase is required)
    let securityStatus: SecurityStatus = 'UNSECURED';
    let passphraseValid = true;

    if (formData.securePassphrase && formData.securePassphrase.trim() !== '') {
      // If form has a passphrase, validate against input
      passphraseValid = securityService.validatePassphrase(
        inputPassphrase || '',
        formData.securePassphrase
      );
      securityStatus = securityService.getSecurityStatus(true, passphraseValid);

      // If passphrase validation failed, return error
      if (!passphraseValid) {
        return {
          success: false,
          message: 'Invalid secure passphrase',
          error: 'The provided passphrase is incorrect for this signal'
        };
      }
    }

    // 2. Process integrations based on interest types
    const integrationResults: Record<string, ServiceResponse> = {};

    // 2.1. Process Stripe integration if selected
    if (formData.interestType.stripe && formData.orderSize > 0) {
      const stripeResult = await stripeService.createPaymentIntent(formData.orderSize);
      integrationResults.stripe = stripeResult;
    }

    // 2.2. Process GitHub integration if an artifact is uploaded
    if (artifactFile) {
      // In a real implementation, we'd read the file content
      // For demo purposes, we'll pass a placeholder
      const fileContent = `Mock content for ${artifactFile.name}`;
      const metadata = {
        nodeReference: formData.nodeReference,
        uploadedBy: formData.contactEmail,
        size: artifactFile.size,
      };

      const githubResult = await githubService.uploadArtefact(
        artifactFile.name,
        fileContent,
        metadata
      );
      integrationResults.github = githubResult;

      // 2.3. Use OpenAI to analyze the artifact
      const openaiResult = await openaiService.analyzeArtefact(
        artifactFile.name,
        `Mock content summary for ${artifactFile.name}`
      );
      integrationResults.openai = openaiResult;
    } else {
      // If no artifact, still classify the signal based on company name and node reference
      const textToAnalyze = `${formData.companyName} ${formData.nodeReference || ''}`;
      const openaiResult = await openaiService.classifySignal(textToAnalyze);
      integrationResults.openai = openaiResult;
    }

    // 3. Create event log entry
    const timestamp = new Date().toISOString();
    const eventId = `evt_${Math.random().toString(36).substring(2, 15)}`;

    const eventLog: EventLog = {
      id: eventId,
      timestamp,
      eventType: 'FORM_SUBMISSION',
      data: {
        ...formData,
        artifact: artifactFile ? artifactFile.name : null,
      },
      metadata: {
        stripePaymentIntentId: integrationResults.stripe?.data?.paymentIntentId as string | undefined,
        githubCommitSHA: integrationResults.github?.data?.commitSHA as string | undefined,
        nodeReference: formData.nodeReference,
        gptClassification: integrationResults.openai?.data?.classification as string | undefined,
        securityStatus,
        highPriority: integrationResults.openai?.data?.classification === 'HIGH_PRIORITY',
      }
    };

    // 4. Set event flags based on processing results
    const eventFlags: EventFlags = {
      highSignal: !!eventLog.metadata.highPriority,
      needsMirror: formData.interestType.mirror || integrationResults.openai?.data?.classification === 'MIRROR_NEEDED',
      artifactRejected: false,
      stripeConfirmed: !!integrationResults.stripe?.success,
      artifactLoaded: !!integrationResults.github?.success,
      highRisk: integrationResults.openai?.data?.classification === 'HIGH_RISK',
      gptClassified: !!integrationResults.openai?.success,
    };

    // 5. Store the event
    storageService.saveEvent(eventLog, eventFlags);

    // 6. Log the event to GitHub repo (in a real implementation)
    if (securityStatus !== 'PASSPHRASE-PROTECTED' || passphraseValid) {
      githubService.logEventToRepo({
        id: eventId,
        timestamp,
        type: 'FORM_SUBMISSION',
        source: formData.contactEmail,
        company: formData.companyName,
        nodeReference: formData.nodeReference,
        stripeIntent: integrationResults.stripe?.data?.paymentIntentId as string | undefined,
        artifactSHA: integrationResults.github?.data?.commitSHA as string | undefined,
      });
    }

    return {
      success: true,
      message: 'Signal processed successfully',
      eventId,
    };

  } catch (error) {
    console.error('Error processing signal:', error);
    return {
      success: false,
      message: 'Failed to process signal',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
