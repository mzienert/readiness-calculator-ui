#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// OpenAI Evals expects JSONL format (one JSON object per line)
interface OpenAIEvalEntry {
  input: string;
  ideal: string;
  metadata?: {
    scenario_name: string;
    business_type: string;
    expected_needs_more_info: boolean;
    context_elements: string[];
  };
}

// Convert our scenarios to OpenAI eval format
function createQualifierDataset(): OpenAIEvalEntry[] {
  return [
    {
      input: "Hi, I run a small restaurant in Durango with 12 employees. We use basic POS systems and have annual revenue around $800K. We want to assess our AI readiness.",
      ideal: JSON.stringify({
        business_type: "restaurant",
        employee_count: "12",
        location: "Durango",
        revenue_band: "$800K",
        tech_level: "basic",
        needs_more_info: false
      }),
      metadata: {
        scenario_name: "Restaurant - Complete Context",
        business_type: "restaurant",
        expected_needs_more_info: false,
        context_elements: ["business_type", "employee_count", "location", "revenue", "tech_level"]
      }
    },
    {
      input: "We're a marketing agency and want to do an AI assessment.",
      ideal: JSON.stringify({
        business_type: "marketing agency",
        needs_more_info: true
      }),
      metadata: {
        scenario_name: "Marketing Agency - Partial Context",
        business_type: "marketing_agency",
        expected_needs_more_info: true,
        context_elements: ["business_type"]
      }
    },
    {
      input: "I own a retail store in Cortez, Colorado with 25 employees. We do about $2M in revenue annually and use some inventory management software.",
      ideal: JSON.stringify({
        business_type: "retail",
        employee_count: "25",
        location: "Cortez",
        revenue_band: "$2M",
        tech_level: "inventory management",
        needs_more_info: false
      }),
      metadata: {
        scenario_name: "Retail Store - Medium Business",
        business_type: "retail",
        expected_needs_more_info: false,
        context_elements: ["business_type", "employee_count", "location", "revenue", "tech_level"]
      }
    },
    {
      input: "We're a small medical practice in Bayfield with 8 staff members including 2 doctors. Revenue is around $1.2M per year.",
      ideal: JSON.stringify({
        business_type: "healthcare",
        employee_count: "8",
        location: "Bayfield",
        revenue_band: "$1.2M",
        needs_more_info: false
      }),
      metadata: {
        scenario_name: "Healthcare Practice - Professional Services",
        business_type: "healthcare",
        expected_needs_more_info: false,
        context_elements: ["business_type", "employee_count", "location", "revenue"]
      }
    },
    {
      input: "I run a small construction company. We have 15 employees and work mostly on residential projects in the Four Corners area.",
      ideal: JSON.stringify({
        business_type: "construction",
        employee_count: "15",
        location: "Four Corners",
        needs_more_info: true
      }),
      metadata: {
        scenario_name: "Construction Company - Blue Collar SMB",
        business_type: "construction",
        expected_needs_more_info: true,
        context_elements: ["business_type", "employee_count", "location"]
      }
    },
    {
      input: "We operate a small hotel and adventure tour company in Durango. Seasonal business with 6 full-time and 12 seasonal employees, about $900K annual revenue.",
      ideal: JSON.stringify({
        business_type: "tourism",
        employee_count: "6 full-time, 12 seasonal",
        location: "Durango",
        revenue_band: "$900K",
        business_model: "seasonal",
        needs_more_info: false
      }),
      metadata: {
        scenario_name: "Tourism Business - Seasonal SMB",
        business_type: "tourism",
        expected_needs_more_info: false,
        context_elements: ["business_type", "employee_count", "location", "revenue", "business_model"]
      }
    }
  ];
}

// Create the JSONL file
function createJSONLFile() {
  console.log('🔄 Creating OpenAI Eval Dataset...');

  const dataset = createQualifierDataset();
  const outputPath = path.join(__dirname, 'qualifier-eval-dataset.jsonl');

  // Convert to JSONL format (one JSON object per line)
  const jsonlContent = dataset.map(entry => JSON.stringify(entry)).join('\n');

  fs.writeFileSync(outputPath, jsonlContent);

  console.log(`✅ Dataset created: ${outputPath}`);
  console.log(`📊 Total examples: ${dataset.length}`);
  console.log('');

  // Show sample entry
  console.log('📋 Sample entry:');
  console.log(JSON.stringify(dataset[0], null, 2));

  return outputPath;
}

// Create instructions for uploading to OpenAI
function createUploadInstructions(datasetPath: string) {
  const instructions = `# OpenAI Eval Setup Instructions

## Step 1: Upload Dataset to OpenAI

### Option A: Using OpenAI Web Interface
1. Go to https://platform.openai.com/playground
2. Navigate to "Files" section
3. Upload: \`${path.basename(datasetPath)}\`
4. Purpose: "Evals" (if available) or "Fine-tune"
5. Note the File ID returned

### Option B: Using curl command
\`\`\`bash
curl -X POST \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -F "purpose=fine-tune" \\
  -F "file=@${datasetPath}" \\
  https://api.openai.com/v1/files
\`\`\`

## Step 2: Create Eval in OpenAI Platform

### Manual Setup in OpenAI Dashboard:
1. Go to https://platform.openai.com/ (when evals UI is available)
2. Navigate to "Evals" section
3. Create new eval with:
   - **Name**: "qualifier-agent-context-extraction"
   - **Description**: "Evaluates QualifierAgent business context extraction for SMBs"
   - **Model**: Your Assistant ID (\`${process.env.QUALIFIER_ASSISTANT_ID}\`)
   - **Dataset**: Upload the generated JSONL file
   - **Eval Type**: "Assistant completion" or "Model comparison"

### Success Criteria:
- **Context Completeness**: >80% of available context extracted
- **Industry Accuracy**: 100% correct business type identification
- **Size Accuracy**: Employee count within ±2 of actual
- **Decision Accuracy**: "needs_more_info" decisions match expected

## Step 3: Running Evals

Once set up in OpenAI platform:
1. **One-time runs**: Click "Run Eval" in dashboard
2. **Scheduled runs**: Set up automatic eval runs (daily/weekly)
3. **After Assistant changes**: Run eval before deploying updates

## Step 4: Interpreting Results

OpenAI will provide:
- **Overall score**: Pass/fail rate across all scenarios
- **Per-scenario breakdown**: Which business types are problematic
- **Trend analysis**: Performance over time
- **Comparison**: Before/after Assistant instruction changes

## Benefits of OpenAI Platform Approach:
✅ **Non-technical friendly**: Change eval criteria without code
✅ **Version tracking**: Compare Assistant performance over time
✅ **Automatic scheduling**: Run evals on schedule
✅ **Visual dashboard**: Charts and trends built-in
✅ **Team access**: Multiple team members can view results

## Next Steps:
1. Upload dataset using instructions above
2. Create eval in OpenAI platform
3. Run initial baseline eval
4. Set up regular eval schedule
5. Use results to improve Assistant instructions
`;

  const instructionsPath = path.join(__dirname, 'openai-platform-setup.md');
  fs.writeFileSync(instructionsPath, instructions);

  console.log(`📋 Setup instructions created: ${instructionsPath}`);
  return instructionsPath;
}

// Main execution
function main() {
  console.log('🚀 Creating OpenAI Platform Eval Setup');
  console.log('='.repeat(50));

  try {
    const datasetPath = createJSONLFile();
    const instructionsPath = createUploadInstructions(datasetPath);

    console.log('\n' + '='.repeat(50));
    console.log('✅ OpenAI Platform Eval Setup Complete!');
    console.log('='.repeat(50));
    console.log('');
    console.log('📁 Files created:');
    console.log(`  • Dataset: ${datasetPath}`);
    console.log(`  • Instructions: ${instructionsPath}`);
    console.log('');
    console.log('🔗 Next steps:');
    console.log('  1. Follow instructions in openai-platform-setup.md');
    console.log('  2. Upload dataset to OpenAI platform');
    console.log('  3. Create eval in OpenAI dashboard');
    console.log('  4. Run your first eval!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createQualifierDataset, createJSONLFile };