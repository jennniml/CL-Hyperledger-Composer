/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getAssetRegistry getFactory emit */

/**
 * A proposition is placed by business.
 * @param {org.cityledger.PlaceProposition} tx - The PlaceProposition transaction
 * @transaction
 */
async function PlaceProposition(tx) {
  // eslint-disable-line no-unused-vars

  const factory = getFactory();
  const namespace = 'org.cityledger';

  // Query propositions to get total count and increment id by 1
  const allPropositions = await query('selectAllPropositions');
  let id = (allPropositions.length + 1).toString();

  // Build new proposition asset
  let newProp = factory.newResource(namespace, 'Proposition', id);
  newProp.propId = id;
  newProp.propDetails = tx.propDetails;
  newProp.propStatus = 'PLACED';
  newProp.owner = factory.newRelationship(
    namespace,
    'Business',
    tx.orderer.getIdentifier()
  ); // relationship set in model

  // Get the asset registry for the proposition
  const propositionRegistry = await getAssetRegistry(
    namespace + '.Proposition'
  );
  // Add new proposition to asset registry/blockchain
  await propositionRegistry.add(newProp);

  // Emit an event for the modified proposition asset
  let event = factory.newEvent(namespace, 'PlacePropositionEvent');
  event.propDetails = tx.propDetails;
  event.orderer = newProp.owner;
  emit(event);
}

/**
 * A proposition is delivered to multipass user.
 * @param {org.cityledger.DeliverProposition} tx - The DeliverProposition transaction
 * @transaction
 */
async function DeliverProposition(tx) {
  // eslint-disable-line no-unused-vars

  const factory = getFactory();
  const namespace = 'org.cityledger';

  // Update asset status
  // Get the asset registry for the proposition
  const propositionRegistry = await getAssetRegistry(
    namespace + '.Proposition'
  );
  // Retrieve proposition by id
  let propId = tx.prop.propId;
  let proposition = await propositionRegistry.get(propId);

  // Set and update proposition
  proposition.propStatus = 'DELIVERED';
  await propositionRegistry.update(proposition);

  // Update participant
  // Get Multipass user registry
  const userRegistry = await getParticipantRegistry(
    namespace + '.MultipassUser'
  );
  let userId = tx.multipassOwner.userId;
  let user = await userRegistry.get(userId);

  // Set and update user with delivered proposition
  if (!user.props) {
    user.props = [];
  }
  user.props.push(proposition);
  await userRegistry.update(user);
}

/**
 * A multipass user accepts or denies the proposition.
 * @param {org.cityledger.UpdateProposition} tx - The UpdateProposition transaction
 * @transaction
 */
async function UpdateProposition(tx) {
  // eslint-disable-line no-unused-vars

  const factory = getFactory();
  const namespace = 'org.cityledger';

  // Update proposition asset status
  // Get the asset registry for the proposition
  const propositionRegistry = await getAssetRegistry(
    namespace + '.Proposition'
  );
  // Retrieve proposition by id
  let propId = tx.prop.propId;
  let proposition = await propositionRegistry.get(propId);

  // Set and update proposition asset
  proposition.propStatus = tx.propStatus;
  await propositionRegistry.update(proposition);

  // Update participant proposition status
  // Get Multipass user registry
  const userRegistry = await getParticipantRegistry(
    namespace + '.MultipassUser'
  );
  let userId = tx.multipassOwner.userId;
  let user = await userRegistry.get(userId);

  // Get index of proposition in multipass user
  let index = user.props.findIndex(x => x.propId === propId);
  console.log(index);

  // Set and update user's proposition status
  user.props.splice(index, 1, proposition);
  console.log(user.props);
  await userRegistry.update(user);
}
