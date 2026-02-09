const feedback = {
    'submissionId':1,
    'feedbacks': [{
        path: 'main.cpp',
        startLine: 3,
        endLine: 5,
        message: 'This function has O(n²) complexity. Consider using a dictionary for faster lookups instead of nested iteration.',
        type: 'error'
    },
    {
        path: 'main.cpp',
        startLine: 9,
        endLine: 9,
        message: 'Consider validating the JSON input before parsing to handle malformed data gracefully.',
        type: 'suggestion'
    }]
};