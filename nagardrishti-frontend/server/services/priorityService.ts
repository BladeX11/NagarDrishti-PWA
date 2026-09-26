export const priorityService = {
  computePriority(issue: any): { priority: number, score: number, explanation: string } {
    let score = 0;
    let explanations: string[] = [];

    // Safety tiers: drainage/sewage=1, pothole/road=1, stray animals=2, streetlight/electrical=2, others=3
    const cat = issue.category?.toLowerCase() || issue.categoryId?.toLowerCase() || '';
    if (cat.includes('drainage') || cat.includes('sewage') || cat.includes('pothole') || cat.includes('road')) {
      score += 40;
      explanations.push('High impact category (+40)');
    } else if (cat.includes('stray') || cat.includes('animal') || cat.includes('streetlight') || cat.includes('electrical')) {
      score += 25;
      explanations.push('Medium impact category (+25)');
    } else {
      score += 10;
      explanations.push('Standard category (+10)');
    }

    // Age
    const ageDays = typeof issue.ageInDays === 'number'
      ? issue.ageInDays
      : (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 30) {
      score += 30;
      explanations.push('Older than 30 days (+30)');
    } else if (ageDays > 14) {
      score += 15;
      explanations.push('Older than 14 days (+15)');
    }

    // Supporters
    const supportersCount = issue.supporterCount ?? issue.supportersCount ?? 0;
    if (supportersCount > 50) {
      score += 30;
      explanations.push('High supporter count (+30)');
    } else if (supportersCount > 10) {
      score += 15;
      explanations.push('Medium supporter count (+15)');
    }

    let priority = 4;
    if (score >= 80) priority = 1;
    else if (score >= 50) priority = 2;
    else if (score >= 30) priority = 3;

    return {
      priority,
      score,
      explanation: explanations.join(', ')
    };
  }
};
