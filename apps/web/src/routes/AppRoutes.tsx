import type { ReactElement } from 'react'
import { Route, Routes } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { LandingPage } from '@/components/landing/LandingPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { CaseDetailPage } from '@/features/cases/CaseDetailPage'
import { CasesPage } from '@/features/cases/CasesPage'
import { ClaimDetailPage } from '@/features/claims/ClaimDetailPage'
import { ClaimsPage } from '@/features/claims/ClaimsPage'
import { QueuePage } from '@/features/adjudication/QueuePage'
import { ReviewCasePage } from '@/features/adjudication/ReviewCasePage'
import { InsurerClaimDetailPage } from '@/features/insurer/InsurerClaimDetailPage'
import { InsurerClaimsPage } from '@/features/insurer/InsurerClaimsPage'
import { InsurerPoliciesPage } from '@/features/insurer/InsurerPoliciesPage'
import { BlackSpotsPage } from '@/features/dashboards/BlackSpotsPage'
import { DensityPage } from '@/features/dashboards/DensityPage'
import { FraudFlagsPage } from '@/features/dashboards/FraudFlagsPage'
import { SlaReportPage } from '@/features/dashboards/SlaReportPage'
import { HomePage } from '@/features/home/HomePage'
import { PlaceholderSection } from '@/features/home/PlaceholderSection'
import { SECTIONS } from '@/features/home/sections'
import { ReportSuccessPage } from '@/features/report/ReportSuccessPage'
import { ReportWizard } from '@/features/report/ReportWizard'
import { VehiclesPage } from '@/features/vehicles/VehiclesPage'
import { VerifyReportPage } from '@/features/verify/VerifyReportPage'
import { RequireAuth, RequireRole } from './guards'
import { NotFoundPage } from './NotFoundPage'

/** Sections with a real screen; everything else renders the placeholder. */
const SECTION_SCREENS: Record<string, ReactElement> = {
  myVehicles: <VehiclesPage />,
  myCases: <CasesPage />,
  myClaims: <ClaimsPage />,
  adjudicationQueue: <QueuePage />,
  insurerClaims: <InsurerClaimsPage />,
  insurerPolicies: <InsurerPoliciesPage />,
  slaReport: <SlaReportPage />,
  fraudFlags: <FraudFlagsPage />,
  heatmap: <DensityPage />,
  blackSpots: <BlackSpotsPage />,
}

/**
 * Route map. The authenticated sections are generated from the same registry
 * the home screen lists, so a section can never be linked without a guard or
 * guarded without being reachable.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyReportPage />} />
      <Route path="/verify/:qrToken" element={<VerifyReportPage />} />

      {/* Authenticated */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/app">
            <Route index element={<HomePage />} />

            {SECTIONS.map((section) => (
              <Route
                key={section.path}
                element={<RequireRole allowed={section.roles} />}
              >
                <Route
                  path={section.path}
                  element={
                    SECTION_SCREENS[section.id] ?? (
                      <PlaceholderSection sectionId={section.id} />
                    )
                  }
                />
              </Route>
            ))}

            {/* Detail screens sit under the same citizen guard as their lists. */}
            <Route element={<RequireRole allowed={['citizen']} />}>
              <Route path="/app/cases/:caseNo" element={<CaseDetailPage />} />
              <Route path="/app/claims/:claimId" element={<ClaimDetailPage />} />
            </Route>

            <Route element={<RequireRole allowed={['adjudicator']} />}>
              <Route
                path="/app/adjudication/cases/:caseNo"
                element={<ReviewCasePage />}
              />
            </Route>

            {/* Both insurer roles read a claim; the page itself withholds the
                decision and settlement controls from the admin. */}
            <Route
              element={
                <RequireRole allowed={['insurer_agent', 'insurer_admin']} />
              }
            >
              <Route
                path="/app/insurer/claims/:claimId"
                element={<InsurerClaimDetailPage />}
              />
            </Route>
          </Route>

          {/* UC-01. Anonymous visitors clicking the landing CTA land on login
              first and are returned here by RequireAuth. */}
          <Route path="/report/new" element={<ReportWizard />} />
          <Route path="/report/submitted" element={<ReportSuccessPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
