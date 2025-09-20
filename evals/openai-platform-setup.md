# OpenAI Eval Setup Instructions

## Step 1: Upload Dataset to OpenAI

### Option A: Using OpenAI Web Interface
1. Go to https://platform.openai.com/playground
2. Navigate to "Files" section
3. Upload: `qualifier-eval-dataset.jsonl`
4. Purpose: "Evals" (if available) or "Fine-tune"
5. Note the File ID returned

### Option B: Using curl command
```bash
curl -X POST \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "purpose=fine-tune" \
  -F "file=@/Users/matthewzienert/Documents/readiness-calculator-ui/evals/qualifier-eval-dataset.jsonl" \
  https://api.openai.com/v1/files
```

## Step 2: Create Eval in OpenAI Platform

### Manual Setup in OpenAI Dashboard:
1. Go to https://platform.openai.com/ (when evals UI is available)
2. Navigate to "Evals" section
3. Create new eval with:
   - **Name**: "qualifier-agent-context-extraction"
   - **Description**: "Evaluates QualifierAgent business context extraction for SMBs"
   - **Model**: Your Assistant ID (`undefined`)
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
