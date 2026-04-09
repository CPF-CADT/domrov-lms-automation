const fs = require('fs').promises;
const path = require('path');

async function readAndCombine() {
  try {
    const files = [
    'infrastructure/autoscaling.tf',
    'infrastructure/compute.tf',
    'infrastructure/endpoints.tf',
    'infrastructure/iam.tf',
    'infrastructure/load_balancer.tf',
    'infrastructure/network.tf',
    'infrastructure/outputs.tf',
    'infrastructure/secret_manager_policy.tf',
    'infrastructure/security.tf',
    'infrastructure/user_data.sh',
    'infrastructure/variables.tf',
    'infrastructure/vpc.tf',
    'infrastructure/database.tf',
        'infrastructure/monitoring.tf',
    'infrastructure/scaling.tf',

    ];
    
    let combinedContent = '';
    
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      const content = await fs.readFile(filePath, 'utf8');
      combinedContent += `\n\n========== ${file} ==========\n\n${content}`;
    }
    
    const outputPath = path.join(__dirname, 'combined_output.txt');
    await fs.writeFile(outputPath, combinedContent, 'utf8');
    
    console.log(`✓ Combined output written to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

readAndCombine();