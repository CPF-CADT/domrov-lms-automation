import os

def get_service_files(directory):
    """
    Recursively find all TypeScript service files ending with 'service.ts'.
    """
    service_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith("service.ts"):
                service_files.append(os.path.join(root, file))
    return service_files

def generate_ai_prompt(service_code):
    """
    Inserts service code into the predefined AI prompt, instructing the AI to
    generate Jest tests that also verify the logic of each method.
    """
    prompt_template = f"""
I have a NestJS service that I want to unit test with Jest. The service may have:
- TypeORM repositories injected via @InjectRepository
- Other services injected via the constructor
- Methods that take input objects or parameters
- Methods that may throw exceptions like NotFoundException or BadRequestException
- Some internal utility or helper functions that should NOT be mocked; only mock repositories, external services, or dependencies

Generate a complete Jest unit test suite for this service following these rules:

**Test Case Writing Guidelines:**
1. **Structure:** Each test should include a unique Test Case ID, descriptive title.
2. **Inputs and Data:** Include all required test data explicitly. Cover valid, invalid, boundary, and edge cases.
3. **Coverage:** Test all functional paths (happy path, error conditions, edge cases). Ensure independent execution. Include traceability to requirements or user stories.
4. **Clarity & Maintainability:** Use simple, unambiguous language. Avoid combining multiple scenarios in one test. Document assumptions and dependencies. Keep test cases updated with requirements changes.
5. **Automation Ready:** Write steps suitable for manual or automated execution. Define preconditions, inputs, and expected results clearly. Avoid ambiguity.
6. **Assertions:** When using Jest `expect()` statements, **do not use TypeScript generics** like `expect(result).toEqual<Dto>(...)`. Always use plain objects: `expect(result).toEqual({{...}})`.
7. **Review & Quality:** Organize tests logically by module/feature. Ensure peer-reviewable clarity and completeness.
8. **Naming:** Test case IDs should indicate module, feature, and scenario type. Example: `AUTH_LOGIN_VALID_001`.

**Logic Verification Instructions:**
1. For each public method, generate tests that **assert the method returns correct outputs** for given inputs.
2. Include **edge case and boundary value checks** to validate internal calculations and branching logic.
3. Include **error handling tests** to ensure exceptions are thrown as expected (NotFoundException, BadRequestException, invalid inputs).
4. For methods with calculations, transformations, or conditional logic, explicitly check that **output matches expected logic**, not just that the method executes.
5. Ensure tests are **automated and reproducible**, so running `jest` actually verifies the method behavior.

**Jest Unit Test Requirements:**
1. Automatically mock all TypeORM repositories using `getRepositoryToken()`.
2. Automatically mock all injected services using `jest.fn()`.
3. Do not mock internal utility or helper functions; only mock repositories and external dependencies.
4. For all method parameters, create minimal mock objects so the method executes without errors.
5. Include tests for:
   - Successful execution of each public method
   - Exception and error cases (NotFoundException, BadRequestException, invalid inputs)
   - Verification of **logical correctness** of outputs
6. Do not connect to a real database or external service; all dependencies must be mocked.
7. Use NestJS testing best practices: `Test.createTestingModule()`, `beforeEach()`, Jest `describe/it` blocks.
8. Output a **ready-to-run TypeScript Jest test file** with each test having a unique Test Case ID.

Here is the service code:

{service_code}
"""
    return prompt_template

def main(folder_path, output_dir="service_prompts"):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    service_files = get_service_files(folder_path)
    print(f"Found {len(service_files)} service files.")

    for filepath in service_files:
        try:
            with open(filepath, "r", encoding="utf-8") as f_in:
                code = f_in.read()
                prompt = generate_ai_prompt(code)
                
                service_name = os.path.basename(filepath).replace(".ts", "")
                output_file = os.path.join(output_dir, f"{service_name}_prompt.txt")
                
                with open(output_file, "w", encoding="utf-8") as f_out:
                    f_out.write(prompt)

                print(f"Prompt written for {service_name} -> {output_file}")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")

    print(f"All prompts generated in folder: {output_dir}")

if __name__ == "__main__":
    main('./modules')