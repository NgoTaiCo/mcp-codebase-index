#!/usr/bin/env tsx
/**
 * Check Gemini API Quota and Usage
 * 
 * Displays current quota limits and usage statistics for Gemini API.
 * Helps diagnose rate limit issues and plan API usage.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

interface QuotaInfo {
  model: string;
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

// Known quota limits for different tiers
const QUOTA_LIMITS: Record<string, QuotaInfo> = {
  'gemini-2.0-flash-exp': {
    model: 'gemini-2.0-flash-exp',
    requestsPerMinute: 10,
    tokensPerMinute: 1_000_000, // 1M TPM
    requestsPerDay: 1_500,
  },
  'gemini-2.5-flash': {
    model: 'gemini-2.5-flash',
    requestsPerMinute: 10,
    tokensPerMinute: 4_000_000, // 4M TPM
    requestsPerDay: 1_500,
  },
  'gemini-1.5-flash': {
    model: 'gemini-1.5-flash',
    requestsPerMinute: 15,
    tokensPerMinute: 1_000_000,
    requestsPerDay: 1_500,
  },
};

async function checkQuota() {
  console.log('🔍 Checking Gemini API Quota & Usage\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...\n');

  // Test different models
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
  ];

  for (const modelName of modelsToTest) {
    console.log(`📊 Testing model: ${modelName}`);
    console.log('─'.repeat(60));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
      const startTime = Date.now();
      
      // Simple test request
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: 'Say "OK" only.' }],
        }],
      });

      const endTime = Date.now();
      const response = result.response;
      const text = response.text();

      console.log('✅ Status: Available');
      console.log(`   Response: "${text.trim()}"`);
      console.log(`   Latency: ${endTime - startTime}ms`);

      // Get token counts from response
      const usageMetadata = response.usageMetadata;
      if (usageMetadata) {
        console.log(`   Tokens - Input: ${usageMetadata.promptTokenCount || 0}, Output: ${usageMetadata.candidatesTokenCount || 0}, Total: ${usageMetadata.totalTokenCount || 0}`);
      }

      // Display quota limits
      const quota = QUOTA_LIMITS[modelName];
      if (quota) {
        console.log('\n📋 Quota Limits (Free Tier):');
        console.log(`   • Requests per minute: ${quota.requestsPerMinute.toLocaleString()}`);
        console.log(`   • Tokens per minute: ${quota.tokensPerMinute.toLocaleString()}`);
        console.log(`   • Requests per day: ${quota.requestsPerDay.toLocaleString()}`);
        
        if (usageMetadata?.totalTokenCount) {
          const requestsPerBudget = Math.floor(quota.tokensPerMinute / usageMetadata.totalTokenCount);
          console.log(`   • Est. requests per minute (this task): ~${requestsPerBudget}`);
        }
      }

    } catch (error: any) {
      console.log('❌ Status: Error');
      
      if (error.status === 429) {
        console.log('   Error: Rate limit exceeded (429)');
        
        // Parse error details
        const errorDetails = error.errorDetails || [];
        const quotaFailure = errorDetails.find((d: any) => d['@type']?.includes('QuotaFailure'));
        const retryInfo = errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
        
        if (quotaFailure) {
          console.log('\n   Quota Violations:');
          quotaFailure.violations?.forEach((v: any) => {
            console.log(`   • ${v.quotaMetric}`);
            console.log(`     Quota ID: ${v.quotaId}`);
            console.log(`     Model: ${v.quotaDimensions?.model || 'N/A'}`);
          });
        }
        
        if (retryInfo) {
          const retryDelay = retryInfo.retryDelay || 'Unknown';
          console.log(`\n   ⏰ Retry after: ${retryDelay}`);
        }
        
        // Display quota limits anyway
        const quota = QUOTA_LIMITS[modelName];
        if (quota) {
          console.log('\n📋 Quota Limits (Free Tier):');
          console.log(`   • Requests per minute: ${quota.requestsPerMinute.toLocaleString()}`);
          console.log(`   • Tokens per minute: ${quota.tokensPerMinute.toLocaleString()}`);
          console.log(`   • Requests per day: ${quota.requestsPerDay.toLocaleString()}`);
        }
        
      } else if (error.status === 404) {
        console.log('   Error: Model not found (404)');
        console.log('   This model may not be available in your region or tier.');
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log(''); // Empty line between models
  }

  // Summary and recommendations
  console.log('\n💡 Recommendations:');
  console.log('─'.repeat(60));
  console.log('1. Use gemini-2.5-flash for production (4M TPM)');
  console.log('2. Use gemini-2.0-flash-exp for testing (1M TPM)');
  console.log('3. Implement exponential backoff for 429 errors');
  console.log('4. Monitor usage at: https://ai.google.dev/usage');
  console.log('5. Free tier resets: Per-minute (60s), Per-day (24h)');
  console.log('\n📚 Docs: https://ai.google.dev/gemini-api/docs/rate-limits');
}

// Run check
checkQuota().catch(console.error);
