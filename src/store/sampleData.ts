import { StudyDocument } from '../types/document';
import { Workspace } from '../types/workspace';
import { mergeSlideLines } from '../logic/extraction/slideMerger';

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-cloud',
    name: 'Cloud Computing',
    course: 'Cloud Computing',
    description: 'Cloud architectures, service models (IaaS/PaaS/SaaS), virtualization, and SLAs.',
    color: 'blue',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'ws-security',
    name: 'Information Security',
    course: 'Information Security',
    description: 'The CIA triad, symmetric/asymmetric cryptography, PKI, and OWASP web threats.',
    color: 'rose',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'ws-mobile',
    name: 'Mobile App Development',
    course: 'Mobile App Development',
    description: 'Android & iOS lifecycle, MVVM pattern, Jetpack Compose, and JWT tokens.',
    color: 'emerald',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    id: 'ws-testing',
    name: 'Software Testing Strategies',
    course: 'Software Testing Strategies',
    description: 'TDD Red-Green-Refactor, test pyramid, boundary value analysis, and CI/CD.',
    color: 'amber',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
  },
];

export const SAMPLE_DOCUMENTS: Array<{
  id: string;
  workspaceId: string;
  title: string;
  course: string;
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSize: number;
  rawSlideText: string;
}> = [
  {
    id: 'sample-cloud-comp',
    workspaceId: 'ws-cloud',
    title: 'Cloud Computing: Service Models & Elasticity',
    course: 'Cloud Computing',
    fileName: 'lecture-02-cloud-models.pdf',
    fileType: 'pdf',
    fileSize: 245000,
    rawSlideText: `LECTURE 2: CLOUD COMPUTING SERVICE ARCHITECTURES

Overview:
• Cloud Computing is defined as a model for enabling ubiquitous, convenient, on-demand network access to a shared pool of configurable computing resources.
• Cloud services deliver scalable hardware and software utilities over the public or private internet.

Service Models:
• Infrastructure as a Service (IaaS) provides virtualized computing resources such as virtual machines, raw block storage, and software-defined networking.
• With IaaS, users manage the operating system, middleware, and application runtime while the cloud provider manages physical hardware and virtualization.
• Platform as a Service (PaaS) delivers hardware and software tools over the internet, primarily used for rapid application development and deployment.
• Developers focus exclusively on application code and business logic without managing the underlying operating system or container orchestration.
• Software as a Service (SaaS) is a complete cloud-hosted software application centrally maintained and delivered to end users via web browsers.
• Users do not manage any application infrastructure, updates, or maintenance.

Key Characteristics:
• Rapid Elasticity refers to the ability of cloud resources to dynamically scale up or scale down in response to real-time workload fluctuations.
• Multi-Tenancy allows multiple tenants or customers to share common computing infrastructure while maintaining strict logical isolation and data security.
• A Service Level Agreement (SLA) is defined as a formal contract between a cloud service provider and a customer specifying metrics for uptime, latency, and disaster recovery.
• High availability ensures continuous operation through redundant instances across distinct availability zones.`,
  },
  {
    id: 'sample-info-sec',
    workspaceId: 'ws-security',
    title: 'Information Security: The CIA Triad & Cryptography',
    course: 'Information Security',
    fileName: 'info-sec-module1-cia.pdf',
    fileType: 'pdf',
    fileSize: 312000,
    rawSlideText: `INFORMATION SECURITY FUNDAMENTALS

The CIA Triad:
• Confidentiality, Integrity, and Availability (CIA) is defined as the foundational security triad guiding all enterprise information security policies and controls.
• Confidentiality ensures that sensitive information is shielded from unauthorized inspection, disclosure, or interception.
• Confidentiality is enforced using strong encryption algorithms, access control lists, and multi-factor authentication.
• Integrity refers to maintaining the absolute accuracy, completeness, and trustworthiness of data throughout its entire lifecycle.
• Integrity prevents unauthorized modification, tampering, or undetected corruption through cryptographic hashing and digital signatures.
• Availability ensures that authorized users have uninterrupted and timely access to critical systems, networks, and data assets.
• Availability controls include automated load balancing, distributed denial of service mitigation, and geographical data backups.

Modern Cryptographic Standards:
• Advanced Encryption Standard (AES) is a symmetric block cipher chosen by the US government to protect sensitive and classified data.
• Rivest–Shamir–Adleman (RSA) is an asymmetric public-key cryptosystem widely used for secure key exchange and digital identity verification.
• Public Key Infrastructure (PKI) refers to the comprehensive framework of digital certificates, certificate authorities, and public-private key pairs.

Threats and Vulnerabilities:
• Cross-Site Scripting (XSS) is a web security vulnerability that allows malicious attackers to inject client-side scripts into web pages viewed by legitimate users.
• Role-Based Access Control (RBAC) is defined as an access control mechanism that assigns system permissions to specific organizational roles rather than individual user accounts.
• Cross-Site Request Forgery (CSRF) is an exploit that tricks an authenticated user into executing unwanted state-changing actions on a trusted web application.`,
  },
  {
    id: 'sample-mobile-dev',
    workspaceId: 'ws-mobile',
    title: 'Mobile App Development: MVVM Architecture & Lifecycle',
    course: 'Mobile App Development',
    fileName: 'mobile-dev-mvvm-notes.pdf',
    fileType: 'pdf',
    fileSize: 198000,
    rawSlideText: `MOBILE APP ARCHITECTURE AND PATTERNS

Architectural Overview:
• Model-View-ViewModel (MVVM) is defined as an architectural software pattern that strictly separates user interface presentation from core business logic.
• In MVVM, the View observes observable state emitted by the ViewModel and handles user touch interactions.
• The ViewModel holds UI state, coordinates business logic, and exposes immutable streams of data to the view layer.
• The Model layer encapsulates data access, local SQLite or Room persistence, and remote RESTful network repositories.

Component Lifecycle:
• Activity lifecycle management in mobile operating systems dictates state transitions between created, started, resumed, paused, stopped, and destroyed.
• Proper lifecycle handling prevents memory leaks, unnecessary background battery consumption, and UI configuration loss upon device rotation.
• Jetpack Compose and SwiftUI provide declarative UI frameworks where the interface is synthesized directly as a function of application state.

Networking and Security:
• Application Programming Interface (API) refers to the structured protocol allowing client mobile apps to securely communicate with backend microservices.
• JSON Web Token (JWT) is a compact, URL-safe standard used for securely transmitting claims and identity tokens between client and server.
• Android Package Kit (APK) is the package file format utilized by Android for the distribution and installation of mobile applications.`,
  },
  {
    id: 'sample-soft-testing',
    workspaceId: 'ws-testing',
    title: 'Software Testing Strategies: TDD & Test Pyramid',
    course: 'Software Testing Strategies',
    fileName: 'testing-strategies-tdd.pdf',
    fileType: 'pdf',
    fileSize: 220000,
    rawSlideText: `SOFTWARE TESTING STRATEGIES & METHODOLOGIES

Verification versus Validation:
• Verification is defined as the evaluation of software artifacts to ensure they satisfy specified architectural constraints and requirements.
• Validation ensures that the built software product fulfills its intended operational purpose and satisfies end-user expectations.

Test-Driven Development (TDD):
• Test-Driven Development (TDD) refers to an iterative software engineering process where automated unit test cases are written prior to implementing production code.
• The TDD cycle follows the Red-Green-Refactor loop:
  1. Red: Write a failing unit test that specifies a single discrete unit requirement.
  2. Green: Implement the minimal production code necessary to make the failing test pass.
  3. Refactor: Clean and optimize the codebase while keeping the test suite green.
• Behavior-Driven Development (BDD) is an agile methodology that extends TDD by writing test specifications in human-readable, domain-specific language.

The Test Pyramid:
• Unit testing forms the foundation of the test pyramid, validating isolated classes and pure functions in milliseconds with test doubles.
• Integration testing verifies that disparate components, databases, and network clients interact correctly according to API contracts.
• End-to-End (E2E) testing validates complete user journeys through the compiled application interface under simulated production conditions.
• Continuous Integration (CI) refers to the engineering practice of automatically compiling, testing, and verifying code upon every repository commit.`,
  },
];

export function createInitialSampleDocuments(): StudyDocument[] {
  return SAMPLE_DOCUMENTS.map((sample) => {
    const mergeResult = mergeSlideLines(sample.rawSlideText);
    const pages = [
      {
        pageNumber: 1,
        text: sample.rawSlideText,
        hasTextLayer: true,
        ocrApplied: false,
        wordCount: sample.rawSlideText.split(/\s+/).filter(Boolean).length,
      },
    ];

    return {
      id: sample.id,
      workspaceId: sample.workspaceId,
      title: sample.title,
      course: sample.course,
      fileName: sample.fileName,
      fileType: sample.fileType,
      fileSize: sample.fileSize,
      totalPages: 1,
      pages,
      fullText: sample.rawSlideText,
      processedText: mergeResult.mergedText,
      slideMergeApplied: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      updatedAt: Date.now(),
    };
  });
}
