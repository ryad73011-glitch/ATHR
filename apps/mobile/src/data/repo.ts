import type {
AffiliateClick,
AppNotification,
AccountContactDetails,
DeliveryAddress,
AuditLog,
Battle,
BattleResult,
Collection,
Comment,
EditorialStory,
Look,
LookFilter,
Merchant,
Outfit,
Paged,
Product,
ProductFilter,
Profile,
PublicProfile,
Report,
StudioRequest,
StudioResult,
WasmChatRequest,
StylePreferences,
Subscription,
SubscriptionPlan,
WardrobeItem,
} from './types';

export interface AuthSession {
user_id: string;
email: string;
access_token: string;
mode: 'demo' | 'live';
}

/**

* The single async contract every screen codes against.
* Demo and live sources implement the same interface.
  */
  export interface DataSource {
  readonly mode: 'demo' | 'live';

// --- auth & profile -------------------------------------------------------
getSession(): Promise<AuthSession | null>;
signIn(email: string, password: string): Promise<AuthSession>;
resetPasswordForEmail(email: string): Promise<void>;
updatePassword(password: string): Promise<void>;
signUp(input: {
email: string;
password: string;
handle: string;
display_name: string;
phone: string;
wilaya: string;
commune: string;
}): Promise<AuthSession>;

/**

* Complete a Supabase email-confirmation callback.
* Optional so the demo data source remains compatible.
  */
  completeAuthCallback?(code: string): Promise<void>;

signOut(): Promise<void>;
getProfile(id: string): Promise<Profile>;
updateProfile(id: string, patch: Partial<Profile>): Promise<Profile>;
getAccountContactDetails(userId: string): Promise<AccountContactDetails>;
updateAccountContactDetails(userId: string, patch: Partial<Pick<AccountContactDetails, 'phone' | 'wilaya' | 'commune'>>): Promise<AccountContactDetails>;
listDeliveryAddresses(userId: string): Promise<DeliveryAddress[]>;
saveDeliveryAddress(address: Omit<DeliveryAddress, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<DeliveryAddress>;
deleteDeliveryAddress(id: string): Promise<void>;
getPreferences(userId: string): Promise<StylePreferences>;
updatePreferences(userId: string, patch: Partial<StylePreferences>): Promise<StylePreferences>;

// --- catalogue ------------------------------------------------------------
listProducts(filter: ProductFilter): Promise<Paged<Product>>;
getProduct(id: string): Promise<Product | null>;
listLooks(filter: LookFilter): Promise<Paged<Look>>;
getLook(id: string): Promise<Look | null>;
similarLooks(lookId: string, limit?: number): Promise<Look[]>;

// --- merchants ------------------------------------------------------------
listMerchants(opts?: { approvedOnly?: boolean }): Promise<Merchant[]>;
getMerchant(id: string): Promise<Merchant | null>;
applyMerchant(input: Partial<Merchant> & { name: string; city: string }): Promise<Merchant>;
upsertProduct(
product: Partial<Product> & {
title: string;
price: number;
category: Product['category'];
},
merchantId: string,
): Promise<Product>;
merchantStats(merchantId: string): Promise<{
impressions: number;
clicks: number;
ctr: number;
est_commission: number;
orders: number;
by_day: { day: string; clicks: number }[];
}>;

// --- engagement -----------------------------------------------------------
likeLook(lookId: string, on: boolean): Promise<void>;
toggleSaveLook(lookId: string): Promise<boolean>;
isSaved(lookId: string): Promise<boolean>;
listSavedLooks(userId: string): Promise<Look[]>;
listComments(lookId: string): Promise<Comment[]>;
addComment(lookId: string, body: string): Promise<Comment>;

// --- battles --------------------------------------------------------------
listBattles(opts?: { status?: Battle['status'] }): Promise<Battle[]>;
getBattleResult(id: string): Promise<BattleResult | null>;
vote(battleId: string, side: 'left' | 'right'): Promise<BattleResult>;

// --- editorial ------------------------------------------------------------
listStories(): Promise<EditorialStory[]>;
getStory(slug: string): Promise<EditorialStory | null>;

// --- wardrobe -------------------------------------------------------------
listWardrobe(ownerId: string): Promise<WardrobeItem[]>;
addWardrobeItem(
item: Omit<WardrobeItem, 'id' | 'created_at' | 'worn_count'>,
): Promise<WardrobeItem>;
deleteWardrobeItem(id: string): Promise<void>;
listOutfits(ownerId: string): Promise<Outfit[]>;
saveOutfit(outfit: Omit<Outfit, 'id' | 'created_at'>): Promise<Outfit>;
deleteOutfit(id: string): Promise<void>;

// --- collections ----------------------------------------------------------
listCollections(ownerId: string): Promise<Collection[]>;
createCollection(name: string, ownerId: string): Promise<Collection>;
toggleLookInCollection(collectionId: string, lookId: string): Promise<boolean>;

// --- community ------------------------------------------------------------
listFeed(limit?: number): Promise<Look[]>;
listPublicProfiles(): Promise<PublicProfile[]>;
getProfileByHandle(handle: string): Promise<PublicProfile | null>;
toggleFollow(userId: string): Promise<boolean>;
listFollows(): Promise<string[]>;
submitReport(
report: Omit<Report, 'id' | 'status' | 'created_at'>,
): Promise<Report>;

// --- notifications --------------------------------------------------------
listNotifications(userId: string): Promise<AppNotification[]>;
markNotificationRead(id: string): Promise<void>;
markAllNotificationsRead(userId: string): Promise<void>;

// --- affiliate & subscription --------------------------------------------
recordAffiliateClick(
click: Omit<AffiliateClick, 'id' | 'created_at'>,
): Promise<AffiliateClick>;
getSubscription(userId: string): Promise<Subscription>;
requestCheckout(plan: SubscriptionPlan): Promise<{
status: 'not_configured' | 'url';
url?: string;
message: string;
}>;

// --- studio (AI) ----------------------------------------------------------
runStudio(req: StudioRequest): Promise<StudioResult>;
runWasmChat(req: WasmChatRequest): Promise<StudioResult>;

// --- admin ----------------------------------------------------------------
adminOverview(): Promise<{
users: number;
merchants: number;
pending_merchants: number;
products: number;
looks: number;
battles_live: number;
open_reports: number;
votes_total: number;
ai_calls: number;
premium_users: number;
}>;
adminListReports(): Promise<Report[]>;
adminResolveReport(id: string, action: 'actioned' | 'dismissed'): Promise<Report>;
adminSetMerchantApproval(id: string, approved: boolean): Promise<Merchant>;
adminListAudit(): Promise<AuditLog[]>;
adminListUsers(): Promise<Profile[]>;
}