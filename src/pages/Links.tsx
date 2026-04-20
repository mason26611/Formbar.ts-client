import { useEffect, useState } from "react";
import { getClassLinks } from "../api/classApi";
import { useClassData, useUserData } from "../main";
import { currentUserHasScope } from "../utils/scopeUtils";
import FormbarHeader from "../components/FormbarHeader";

export default function Links() {
	const { userData } = useUserData();

	const [classLinks, setClassLinks] = useState<any[]>([]);

	const canSeeLinks = currentUserHasScope(userData, "class.links.read");

	useEffect(() => {
		if(!userData || !userData?.activeClass || !canSeeLinks) return;

		console.log(
			`Fetching links for class: ${userData.activeClass}`
		)

		getClassLinks(userData.activeClass).then((response) => {
			setClassLinks(response.data.links);
			console.log(response.data.links);
			for (const link of response.data.links) {
				getFaviconForLink(link).then((favicon) => {
					link.favicon = favicon;
				});
			}
		});
	}, [userData, canSeeLinks, getClassLinks]);

	return (
		<>
			<FormbarHeader />
			<h1>Links</h1>
			{
				classLinks.length > 0 ? (
					<ul>
						{classLinks.map((link, index) => (
							<li key={index}>
								<a href={link.url} target="_blank" rel="noopener noreferrer">
									{link.name}
								</a>
							</li>
						))}
					</ul>
				) : (
					<p>No links available.</p>
				)
			}
		</>
	);
}

//! THIS DOES NOT WORK YET.
//! TRY MORE

function getFaviconForLink(link: any): Promise<string> {
    const iconSize = 32;
    const domain = new URL(link.url).hostname;
    // Use cors-anywhere or allorigins as a proxy
    const apiLink = `https://cors-anywhere.herokuapp.com/https://www.google.com/s2/favicons?domain=${domain}&sz=${iconSize}`

    const promise = fetch(apiLink)
        .then((response) => response.blob())
        .then((blob) => {
            return URL.createObjectURL(blob);
        })
        .catch(() => "/favicon.ico");
    return promise;
}