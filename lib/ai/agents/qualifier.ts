import { generateObject, generateText } from 'ai';
import { myProvider } from '../providers';
import { 
  type SMBQualifier, 
  type DynamicWeighting, 
  type QualifierResponse,
  qualifierResponseSchema,
  smbQualifierSchema
} from '../schemas';
import type { CoreMessage } from 'ai';

export class QualifierAgent {
  private model = myProvider.languageModel('chat-model');

  /**
   * Determines if the current conversation is ready for qualification
   */
  async shouldQualify(messages: CoreMessage[]): Promise<boolean> {
    // Simple heuristic: start qualifying if user has engaged with initial greeting
    return messages.length >= 2;
  }

  /**
   * Generates qualifying questions for SMB context collection
   */
  async generateQualifyingQuestions(messages: CoreMessage[]): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      system: `You are a friendly AI readiness consultant for La Plata County SMBs. 
      
Your role is to collect basic business context to personalize the assessment. Ask ONE question at a time to avoid overwhelming the user.

Start by explaining briefly what you'll do, then ask about their business size. Use friendly, empathetic language suitable for small business owners.

Focus on:
- Employee count (including just the owner for solopreneurs)
- Revenue range (be sensitive about this topic)
- Business type/industry
- Location confirmation (La Plata County focus)

Keep it conversational and encouraging. Many SMB owners may feel intimidated by "assessments" so emphasize this is to help customize guidance for their specific situation.`,
      messages,
      maxTokens: 200,
    });

    return text;
  }

  /**
   * Attempts to extract SMB qualifier data from conversation
   */
  async extractQualifierData(messages: CoreMessage[]): Promise<SMBQualifier | null> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: smbQualifierSchema.partial(), // Allow partial data initially
        system: `Extract SMB business context from the conversation. Only include information that has been clearly stated by the user.

Employee Count Guidelines:
- "just me", "solo", "by myself" = "1"
- "me and my wife", "small team", "few employees" = "2-10"  
- specific numbers: map to appropriate range

Revenue Guidelines:
- Only extract if user has mentioned revenue/sales figures
- Be conservative with estimates
- "small business", "startup" without numbers = don't guess

Business Type:
- "solopreneur" = working alone
- "family-owned" = family business mentioned
- "rural-local" = serves local/rural market
- "small-team" = has employees
- "medium-business" = larger operation

If information is unclear or not provided, omit those fields.`,
        messages,
      });

      // Validate we have enough information to proceed
      if (!object.employeeCount) {
        return null;
      }

      return object as SMBQualifier;
    } catch (error) {
      console.error('Error extracting qualifier data:', error);
      return null;
    }
  }

  /**
   * Calculate dynamic weighting based on SMB characteristics
   */
  calculateDynamicWeighting(qualifier: SMBQualifier): DynamicWeighting {
    const weighting: DynamicWeighting = {
      solopreneurBonus: 0,
      budgetSensitive: false,
      ruralFocus: false,
      scoreAdjustment: 0,
    };

    // Solopreneur adjustments - relax scoring thresholds
    if (qualifier.employeeCount === '1') {
      weighting.solopreneurBonus = 1;
      weighting.scoreAdjustment = 1; // +1 to scores for accessibility
    }

    // Budget sensitivity for low revenue businesses
    if (qualifier.revenueBand === 'under-100k') {
      weighting.budgetSensitive = true;
      weighting.scoreAdjustment += 1; // Additional +1 for budget constraints
    }

    // Rural/local business focus
    if (qualifier.businessType === 'rural-local' || qualifier.businessType === 'family-owned') {
      weighting.ruralFocus = true;
    }

    return weighting;
  }

  /**
   * Complete the qualification phase
   */
  async completeQualification(
    messages: CoreMessage[], 
    qualifier: SMBQualifier
  ): Promise<QualifierResponse> {
    const dynamicWeighting = this.calculateDynamicWeighting(qualifier);

    const { object } = await generateObject({
      model: this.model,
      schema: qualifierResponseSchema,
      system: `You've collected the SMB business context. Generate a response that:
1. Acknowledges their business characteristics 
2. Explains how the assessment will be personalized for them
3. Sets expectations for the 6-category assessment process
4. Provides an encouraging transition message to start the assessment

Be empathetic about their business constraints and emphasize this assessment is designed specifically for SMBs like theirs.

The dynamic weighting means:
- Solopreneur bonus: ${dynamicWeighting.solopreneurBonus} (makes assessment more accessible)
- Budget sensitive: ${dynamicWeighting.budgetSensitive} (focuses on cost-effective solutions)
- Rural focus: ${dynamicWeighting.ruralFocus} (emphasizes local market considerations)`,
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: `Based on our conversation, I understand you have a ${qualifier.businessType} business with ${qualifier.employeeCount === '1' ? 'just yourself' : qualifier.employeeCount + ' employees'}${qualifier.revenueBand ? ` in the ${qualifier.revenueBand.replace('-', ' to $').replace('k', ',000').replace('m', ' million')} revenue range` : ''}.

I'll personalize this assessment for your specific situation. Since you're ${qualifier.employeeCount === '1' ? 'a solopreneur' : 'running a small business'}, I've adjusted the evaluation criteria to be more appropriate for your context.

The assessment covers 6 key areas: Market Strategy, Business Understanding, Workforce, Company Culture, Technology, and Data. I'll ask questions one at a time to keep this manageable.

Ready to begin with the first assessment question?`
        }
      ],
    });

    return {
      type: 'qualifier_complete',
      qualifier,
      dynamicWeighting,
      nextMessage: object.nextMessage,
      readyForAssessment: true,
    };
  }

  /**
   * Main processing method for QualifierAgent
   */
  async process(messages: CoreMessage[]): Promise<{
    response: string;
    qualifier?: SMBQualifier;
    dynamicWeighting?: DynamicWeighting;
    isComplete: boolean;
  }> {
    // Try to extract qualifier data from current conversation
    const qualifier = await this.extractQualifierData(messages);

    if (!qualifier) {
      // Still need more information, ask qualifying questions
      const response = await this.generateQualifyingQuestions(messages);
      return {
        response,
        isComplete: false,
      };
    }

    // We have enough information, complete qualification
    const qualifierResponse = await this.completeQualification(messages, qualifier);
    
    return {
      response: qualifierResponse.nextMessage,
      qualifier: qualifierResponse.qualifier,
      dynamicWeighting: qualifierResponse.dynamicWeighting,
      isComplete: true,
    };
  }
}