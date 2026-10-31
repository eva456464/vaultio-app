# API service functions (extracted from the JS bundle)

Each row: client function name → HTTP method → the (minified) argument expression building the URL/body. Variables like `a`/`e`/`n` are minified: typically `a` = base path constant (e.g. `/content-plan`, `/backlinks`), `e` = orgWebsiteId, `n` = item id, `r` = body. Combine with `API-MAP-FROM-BUNDLE.md` for the path constants. BLG-internal admin functions are included for completeness but are NOT part of the customer product.

| Function | Method | URL / args expression (minified) |
|---|---|---|
| `addOrgWebsite` | POST | `n.ENDPOINTS.ORGANIZATION.ADD_ORG_WEBSITE,e` |
| `addOrganizationMember` | POST | `n.ENDPOINTS.ORGANIZATION.INVITE_MEMBER,{email:e,role:r,websiteIds:a}` |
| `adjustCredits` | POST | `concat(a,"/") + e,"/adjust-credits"` |
| `answerSuggestion` | POST | `l(o.ENDPOINTS.GBP.ANSWER_SUGGESTION,e` |
| `applySuggestion` | POST | `l(o.ENDPOINTS.GBP.APPLY_SUGGESTION,e` |
| `applySuggestions` | POST | `o.ENDPOINTS.GBP.APPLY_SUGGESTIONS,{ids:e}` |
| `askAssistant` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/assistant-conversation/messages"` |
| `changePassword` | POST | `o.ENDPOINTS.AUTH.CHANGE_PASSWORD,{newPassword:e}` |
| `checkOnboardingStatus` | GET | `n.ENDPOINTS.ORGANIZATION.CHECK_ONBOARDING_STATUS` |
| `checkWebsiteDns` | GET | `concat(n.ENDPOINTS.ORGANIZATION.CHECK_WEBSITE_DNS,"?url=") + encodeURIComponent(e.toLowerCase().trim()))` |
| `clearAssistantConversation` | DELETE | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/assistant-conversation")` |
| `clearPublishedUrls` | POST | `concat(a,"/") + e,"/clear-published-urls")` |
| `connectNextjsBlog` | POST | `n.ENDPOINTS.ORGANIZATION.CONNECT_NEXTJS_BLOG` |
| `createArticle` | POST | `n.ENDPOINTS.BLG_ADMIN.ARTICLES,e` |
| `createCustomerCheckoutSession` | POST | `h.ENDPOINTS.SUBSCRIPTION.CREATE_CUSTOMER_CHECKOUT_SESSION,u` |
| `createFormSubmission` | POST | `concat(S.ENDPOINTS.PUBLIC.SAVE_FORM_SUBMISSION` |
| `createOrgWebsite` | POST | `n.ENDPOINTS.ORGANIZATION.CREATE_ORG_WEBSITE,e` |
| `createSubscription` | POST | `h.ENDPOINTS.SUBSCRIPTION.CREATE_SUBSCRIPTION,l` |
| `createWinbackCheckout` | POST | `S.ENDPOINTS.PUBLIC.WINBACK_CHECKOUT,e` |
| `delete` | DELETE | `concat(n.ENDPOINTS.ASYNC_JOBS.DELETE,"/") + e)` |
| `deleteAccount` | DELETE | `o.ENDPOINTS.USERS.DELETE_ACCOUNT` |
| `deleteArticle` | DELETE | `concat(a,"/") + e,"/articles/") + n)` |
| `deleteContentPlan` | DELETE | `concat(a,"/") + e,"/content-plan/") + n)` |
| `deleteHostedBlog` | DELETE | `concat(a,"/") + e,"/hosted-blog")` |
| `deletePages` | DELETE | `concat(a,"/") + e,"/pages"` |
| `detectBrandColors` | GET | `concat(n.ENDPOINTS.ORGANIZATION.DETECT_BRAND_COLORS,"?url=") + encodeURIComponent(e.toLowerCase().trim()))` |
| `detectBranding` | GET | `a.ENDPOINTS.WHITELABEL.DETECT_BRANDING,{params:{url:e},timeout:6e4}` |
| `disconnect` | DELETE | `o.ENDPOINTS.GBP.DISCONNECT` |
| `disconnectNextjsBlog` | POST | `n.ENDPOINTS.ORGANIZATION.DISCONNECT_NEXTJS_BLOG` |
| `downloadArticle` | GET | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/download"` |
| `editArticle` | PUT | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e` |
| `editSuggestion` | POST | `l(o.ENDPOINTS.GBP.EDIT_SUGGESTION,e` |
| `exportArticleAsHtml` | GET | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/export-html"` |
| `generateAgencyReport` | POST | `concat(n.ENDPOINTS.BLG_ADMIN.ORG_WEBSITE_AGENCY_REPORT,"/") + e,"/agency-report"` |
| `generateApiKey` | POST | `n.ENDPOINTS.ORGANIZATION.GENERATE_API_KEY,{source:e}` |
| `generateDescriptionFromUrl` | GET | `concat(n.ENDPOINTS.ORGANIZATION.GENERATE_DESCRIPTION_FROM_URL,"?url=") + encodeURIComponent(a)) + i)` |
| `generateMetaPosts` | POST | `concat(a,"/") + e,"/meta-posting/generate"` |
| `get` | GET | `n.ENDPOINTS.ORGANIZATION.GET` |
| `getArticleById` | GET | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e)` |
| `getArticles` | GET | `concat(i.ENDPOINTS.ARTICLES.GET)` |
| `getAssistantConversation` | GET | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/assistant-conversation")` |
| `getAvailability` | GET | `o.ENDPOINTS.GBP.AVAILABILITY` |
| `getBacklinkTransactions` | GET | `i` |
| `getBlogConfig` | GET | `concat(S.ENDPOINTS.HOSTED_BLOG.GET_CONFIG,"?host=") + e` |
| `getBlogSitemap` | GET | `concat(S.ENDPOINTS.PUBLIC.GET_BLG_BLOGS,"/sitemap")` |
| `getBusinessProfile` | GET | `n.ENDPOINTS.ORGANIZATION.BUSINESS_PROFILE` |
| `getContentPlanList` | GET | `i` |
| `getContentStrategyPreview` | POST | `n.ENDPOINTS.ORGANIZATION.CONTENT_STRATEGY_PREVIEW,{description:e,targetAudience:r}` |
| `getDiscountByCode` | GET | `concat(S.ENDPOINTS.PUBLIC.GET_DISCOUNT,"?couponCode=") + encodeURIComponent(e))` |
| `getFixDuplicateBacklinksStatus` | GET | `n.ENDPOINTS.BLG_ADMIN.FIX_DUPLICATE_BACKLINKS_STATUS` |
| `getLatestArticle` | GET | `concat(i.ENDPOINTS.ARTICLES.GET,"/latest")` |
| `getMe` | GET | `o.ENDPOINTS.USERS.GET_ME` |
| `getMetaPostingArticles` | GET | `concat(a,"/") + e,"/meta-posting/articles?days=") + n)` |
| `getMetaPostingStatus` | GET | `concat(a,"/") + e,"/meta-posting/status")` |
| `getMetaPosts` | GET | `concat(a,"/") + e,"/meta-posting/posts")` |
| `getOAuthStartUrl` | GET | `o.ENDPOINTS.GBP.OAUTH_START,{withCredentials:!0}` |
| `getOrgWebsite` | GET | `n.ENDPOINTS.ORGANIZATION.GET_ORG_WEBSITE` |
| `getOrgWebsites` | GET | `n.ENDPOINTS.ORGANIZATION.GET_ORG_WEBSITES` |
| `getOrganizationById` | GET | `concat(n.ENDPOINTS.BLG_ADMIN.ORGANIZATIONS,"/") + e)` |
| `getPages` | GET | `i` |
| `getProfile` | GET | `o.ENDPOINTS.GBP.PROFILE` |
| `getPruneResendContactsStatus` | GET | `n.ENDPOINTS.BLG_ADMIN.PRUNE_RESEND_CONTACTS_STATUS` |
| `getReferralFriendDiscount` | GET | `concat(S.ENDPOINTS.REDITUS.GET_REFERRAL_DISCOUNT,"?refby=") + encodeURIComponent(e))` |
| `getReferralSummaryForUser` | GET | `concat(n.ENDPOINTS.BLG_ADMIN.USERS,"/") + e,"/referral-summary")` |
| `getRemoveExcessiveBacklinksStatus` | GET | `n.ENDPOINTS.BLG_ADMIN.REMOVE_EXCESSIVE_BACKLINKS_STATUS` |
| `getSettings` | GET | `o.ENDPOINTS.GBP.SETTINGS` |
| `getSetup` | GET | `a.ENDPOINTS.WHITELABEL.SETUP,{timeout:6e4}` |
| `getSignInMethods` | GET | `o.ENDPOINTS.AUTH.SIGN_IN_METHODS` |
| `getStatus` | GET | `o.ENDPOINTS.GBP.STATUS` |
| `getSubscription` | GET | `concat(h.ENDPOINTS.SUBSCRIPTION.GET_ORG_WEBSITE_SUBSCRIPTION) + e?"?type=" + e):""` |
| `getSuggestions` | GET | `o.ENDPOINTS.GBP.SUGGESTIONS` |
| `getTaskQueue` | GET | `s` |
| `getUnpublishedSites` | GET | `n.ENDPOINTS.BLG_ADMIN.UNPUBLISHED_SITES` |
| `getUrlJsonLD` | GET | `concat(S.ENDPOINTS.PUBLIC.GET_JSON_LD,"?url=") + e)` |
| `getUrlMissingKeywords` | GET | `concat(S.ENDPOINTS.PUBLIC.GET_MISSING_KEYWORDS,"?url=") + e,"&countryCode=") + t)` |
| `getWebsiteMetricsHistory` | GET | `n.ENDPOINTS.ORGANIZATION.GET_WEBSITE_METRICS_HISTORY,{params:e?{period:e}:{}}` |
| `getWebsiteStats` | GET | `n.ENDPOINTS.ORGANIZATION.WEBSITE_STATS` |
| `getWhitelabelConfig` | GET | `concat(S.ENDPOINTS.WHITELABEL.GET_CONFIG,"?host=") + e)` |
| `getWhitelabelOrganizations` | GET | `n.ENDPOINTS.BLG_ADMIN.WHITELABEL_ORGANIZATIONS` |
| `getWinbackOffer` | GET | `concat(S.ENDPOINTS.PUBLIC.WINBACK,"?token=") + encodeURIComponent(e))` |
| `list` | GET | `n.ENDPOINTS.ASYNC_JOBS.LIST` |
| `listSuperAdmins` | GET | `n.ENDPOINTS.BLG_ADMIN.SUPER_ADMINS` |
| `listWhitelabelConfigs` | GET | `n.ENDPOINTS.BLG_ADMIN.WHITELABEL_CONFIGS` |
| `previewFixDuplicateBacklinks` | GET | `concat(n.ENDPOINTS.BLG_ADMIN.FIX_DUPLICATE_BACKLINKS_PREVIEW) + null!=e?"?articleId=" + e):"")` |
| `previewStripLinks` | POST | `n.ENDPOINTS.BLG_ADMIN.STRIP_LINKS_PREVIEW,e` |
| `recheckBacklink` | POST | `concat(n.ENDPOINTS.BLG_ADMIN.BACKLINKS,"/") + e,"/recheck")` |
| `refreshToken` | POST | `o.ENDPOINTS.AUTH.REFRESH_TOKEN,{refreshToken:e}` |
| `regenerateContentPlan` | POST | `concat(a,"/") + e,"/regenerate-content-plan")` |
| `regenerateMetaPost` | POST | `concat(n.ENDPOINTS.BLG_ADMIN.META_POSTING_POSTS,"/") + e,"/regenerate")` |
| `regenerateWithFeedback` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/regenerate-with-feedback"` |
| `rejectSuggestion` | POST | `l(o.ENDPOINTS.GBP.REJECT_SUGGESTION,e)` |
| `removeBacklinksForWebsite` | POST | `n.ENDPOINTS.BLG_ADMIN.REMOVE_BACKLINKS_FOR_WEBSITE,e` |
| `removeChurnedBacklinks` | POST | `concat(a,"/") + e,"/remove-churned-backlinks")` |
| `removeOrganizationMember` | DELETE | `concat(n.ENDPOINTS.ORGANIZATION.REMOVE_MEMBER)+e` |
| `requestHelpNeeded` | POST | `s.ENDPOINTS.SUPPORT.HELP_NEEDED,null!=e?e:{}` |
| `requestSignInLink` | POST | `o.ENDPOINTS.AUTH.SIGN_IN_LINK,{email:e,skipPassword:t,turnstileToken:r}` |
| `resetArticleGenerationAttempts` | POST | `n.ENDPOINTS.BLG_ADMIN.RESET_ARTICLE_GENERATION_ATTEMPTS` |
| `resetContentPlan` | POST | `concat(a,"/") + e,"/reset-content-plan")` |
| `resetPasswordRequest` | POST | `o.ENDPOINTS.AUTH.RESET_PASSWORD_REQUEST,{email:e}` |
| `resolveRewriteProposal` | PATCH | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/rewrite-proposals/") + t` |
| `restoreAccount` | POST | `o.ENDPOINTS.USERS.RESTORE_ACCOUNT` |
| `restoreSuggestion` | POST | `l(o.ENDPOINTS.GBP.RESTORE_SUGGESTION,e)` |
| `resyncGa4` | POST | `concat(a,"/") + e,"/ga4/resync")` |
| `revertSuggestion` | POST | `l(o.ENDPOINTS.GBP.REVERT_SUGGESTION,e)` |
| `rewriteText` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/rewrite-text"` |
| `runArticleSatisfactionReport` | POST | `n.ENDPOINTS.BLG_ADMIN.RUN_ARTICLE_SATISFACTION_REPORT` |
| `runBrandAnalysis` | GET | `n.ENDPOINTS.ORGANIZATION.RUN_BRAND_ANALYSIS` |
| `runCancellationReport` | POST | `n.ENDPOINTS.BLG_ADMIN.RUN_CANCELLATION_REPORT` |
| `saveFeedback` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/feedback"` |
| `saveSetup` | POST | `a.ENDPOINTS.WHITELABEL.SETUP,e,{timeout:6e4}` |
| `searchCategories` | GET | `o.ENDPOINTS.GBP.CATEGORIES,{params:{q:e}}` |
| `searchUsers` | GET | `n.ENDPOINTS.BLG_ADMIN.USERS,{params:{q:e}}` |
| `selectLocation` | POST | `o.ENDPOINTS.GBP.SELECT_LOCATION,e` |
| `sendUnpublishedSiteEmail` | POST | `concat(n.ENDPOINTS.BLG_ADMIN.UNPUBLISHED_SITES,"/") + e,"/send-email"` |
| `signIn` | POST | `o.ENDPOINTS.AUTH.SIGN_IN,e` |
| `signInWithGoogle` | POST | `o.ENDPOINTS.AUTH.SIGN_IN_WITH_GOOGLE,{nonce:e}` |
| `signInWithGoogleCodeCallback` | POST | `o.ENDPOINTS.AUTH.SIGN_IN_WITH_GOOGLE_CALLBACK,{googleCode:e,code:s,attributionUrl:i,...a}` |
| `signInWithOauthCallback` | POST | `o.ENDPOINTS.AUTH.SIGN_IN_WITH_CALLBACK,{accessToken:e,refreshToken:i,code:a,attributionUrl:s,...l}` |
| `signUp` | POST | `l,{...e,code:i,userName:e.name,attributionUrl:s,...a}` |
| `startOnboarding` | GET | `n.ENDPOINTS.ORGANIZATION.START_ONBOARDING` |
| `startOnboarding` | POST | `concat(a,"/") + e,"/start-onboarding")` |
| `startSync` | POST | `o.ENDPOINTS.GBP.SYNC` |
| `stripLinks` | POST | `n.ENDPOINTS.BLG_ADMIN.STRIP_LINKS,e` |
| `suggestDomains` | GET | `a.ENDPOINTS.WHITELABEL.SUGGESTED_DOMAINS,{params:{url:e}}` |
| `syncGsc` | POST | `concat(a,"/") + e,"/gsc/sync")` |
| `testTakeScreenshot` | POST | `n.ENDPOINTS.BLG_ADMIN.TAKE_SCREENSHOT,{websiteUrl:e.trim(` |
| `testVercelVerifyDomain` | POST | `n.ENDPOINTS.BLG_ADMIN.HOSTED_BLOG_VERIFY_DOMAIN,{domain:e.trim(` |
| `triggerFixDuplicateBacklinks` | POST | `n.ENDPOINTS.BLG_ADMIN.FIX_DUPLICATE_BACKLINKS,null!=e?{articleId:e}:{}` |
| `triggerPruneResendContacts` | POST | `n.ENDPOINTS.BLG_ADMIN.PRUNE_RESEND_CONTACTS` |
| `triggerRemoveExcessiveBacklinks` | POST | `n.ENDPOINTS.BLG_ADMIN.REMOVE_EXCESSIVE_BACKLINKS,{dryRun:e}` |
| `unpublishArticle` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/unpublish")` |
| `update` | PUT | `n.ENDPOINTS.ORGANIZATION.UPDATE,e` |
| `updateAssistantProposalStatus` | PATCH | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/edit-proposals/") + t` |
| `updateBacklinkEligibility` | PUT | `concat(a,"/") + e,"/backlink-eligibility"` |
| `updateBusinessProfile` | PUT | `n.ENDPOINTS.ORGANIZATION.BUSINESS_PROFILE,e` |
| `updateContentPlanItem` | PATCH | `concat(a,"/") + e,"/content-plan/") + n` |
| `updateDomainRating` | PATCH | `concat(a,"/") + e,"/domain-rating"` |
| `updateFailedWebsite` | PATCH | `concat(a,"/") + e` |
| `updateIndustry` | PATCH | `concat(a,"/") + e,"/industry"` |
| `updateMe` | PUT | `o.ENDPOINTS.USERS.UPDATE_ME,e` |
| `updateOrgWebsite` | PUT | `n.ENDPOINTS.ORGANIZATION.UPDATE_ORG_WEBSITE,e` |
| `updateOrganizationName` | PATCH | `concat(n.ENDPOINTS.BLG_ADMIN.ORGANIZATIONS,"/") + e` |
| `updateSettings` | PUT | `o.ENDPOINTS.GBP.SETTINGS,{contentLanguage:e}` |
| `updateSuperAdminOrganization` | PATCH | `concat(n.ENDPOINTS.BLG_ADMIN.SUPER_ADMINS,"/") + e,"/organization"` |
| `updateUser` | PUT | `o.ENDPOINTS.USERS.GET_USER.replace(":userId",e.toString()` |
| `updateUserWebsiteAccess` | POST | `n.ENDPOINTS.ORGANIZATION.UPDATE_USER_WEBSITE_ACCESS,{userId:e,websiteId:r}` |
| `updateWebsiteScreenshot` | PUT | `n.ENDPOINTS.ORGANIZATION.UPDATE_WEBSITE_SCREENSHOT,r,{headers:{"Content-Type":"multipart/form-data"}}` |
| `updateWebsiteVisibility` | PATCH | `concat(a,"/") + e,"/visibility"` |
| `uploadArticleImage` | POST | `concat(i.ENDPOINTS.ARTICLES.GET,"/") + e,"/upload-image"` |
| `uploadLogo` | POST | `a.ENDPOINTS.WHITELABEL.LOGO,t,{headers:{"Content-Type":"multipart/form-data"}}` |
| `verifySignInCode` | POST | `o.ENDPOINTS.AUTH.VERIFY_SIGN_IN_CODE,{email:e,code:t,...i(` |
| `verifySignInLink` | POST | `o.ENDPOINTS.AUTH.VERIFY_SIGN_IN_LINK,{tokenHash:e,...i(` |
